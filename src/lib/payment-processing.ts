// MY CS MTP — Payment processing helpers shared by /verify, /mock/complete, /cashfree/return, /webhook.
// All post-verification work happens here: create Purchases, debit wallet, decrement promo,
// clear cart, send success email. Idempotent — safe to call more than once per order.
import { db } from '@/lib/db'
import { sendPurchaseSuccessEmail } from '@/lib/email'
import { verifyPayment } from '@/lib/payments'

export interface ProcessOrderResult {
  ok: boolean
  alreadyPaid?: boolean
  order?: Awaited<ReturnType<typeof db.order.findUnique>>
  error?: string
}

export interface CartSnapshotItem {
  cartItemId: string
  planSubjectId: string
  planId: string
  subjectId: string
  livePrice: number
}

// Persist the cart snapshot for an order, so that on verify we don't depend on the live cart.
export async function saveCartSnapshot(internalOrderId: string, items: CartSnapshotItem[]): Promise<void> {
  await db.job.create({
    data: {
      type: 'ORDER_CART_SNAPSHOT',
      payload: JSON.stringify(items),
      createdBy: internalOrderId,
      status: 'QUEUED',
    },
  })
}

// Marks an order PAID and processes all the side effects.
// Idempotent: if the order is already PAID, returns ok=true with alreadyPaid=true.
export async function processPaidOrder(
  internalOrderId: string,
  opts: { gatewayPaymentId?: string; gatewaySignature?: string | null }
): Promise<ProcessOrderResult> {
  const order = await db.order.findUnique({
    where: { id: internalOrderId },
    include: { purchases: true, user: true },
  })
  if (!order) return { ok: false, error: 'Order not found.' }
  if (order.status === 'PAID') {
    return { ok: true, alreadyPaid: true, order }
  }
  if (order.purchases.length === 0) {
    const job = await db.job.findFirst({
      where: { type: 'ORDER_CART_SNAPSHOT', createdBy: internalOrderId },
    })
    if (!job || !job.payload) {
      return { ok: false, error: 'Order cart snapshot missing.' }
    }
    const snapshot: CartSnapshotItem[] = JSON.parse(job.payload)

    await db.$transaction(async (tx) => {
      await tx.purchase.createMany({
        data: snapshot.map((s) => ({
          orderId: internalOrderId,
          userId: order.userId,
          planId: s.planId,
          planSubjectId: s.planSubjectId,
          subjectId: s.subjectId,
          price: s.livePrice,
        })),
      })
      if (order.promoCodeId) {
        await tx.promoCode.update({
          where: { id: order.promoCodeId },
          data: { usedCount: { increment: 1 } },
        })
      }
      if (order.walletUsed > 0) {
        const w = await tx.wallet.upsert({
          where: { userId: order.userId },
          update: { balance: { decrement: order.walletUsed } },
          create: { userId: order.userId, balance: -order.walletUsed },
        })
        await tx.walletTransaction.create({
          data: {
            walletId: w.id,
            userId: order.userId,
            amount: order.walletUsed,
            type: 'DEBIT',
            reason: `Payment for order ${internalOrderId}`,
            reference: internalOrderId,
          },
        })
      }
      await tx.order.update({
        where: { id: internalOrderId },
        data: {
          status: 'PAID',
          gatewayPaymentId: opts.gatewayPaymentId || null,
          gatewaySignature: opts.gatewaySignature || null,
        },
      })
    })

    const cartItemIds = snapshot.map((s) => s.cartItemId).filter(Boolean)
    if (cartItemIds.length > 0) {
      await db.cartItem.deleteMany({ where: { id: { in: cartItemIds } } })
    }
    await db.job.deleteMany({ where: { id: job.id } }).catch(() => undefined)
  }

  try {
    if (order.user?.email) {
      await sendPurchaseSuccessEmail(order.user.email, internalOrderId, order.total)
    }
  } catch (e) {
    console.error('sendPurchaseSuccessEmail failed', e)
  }

  const fresh = await db.order.findUnique({ where: { id: internalOrderId } })
  return { ok: true, order: fresh }
}

export async function failOrder(internalOrderId: string, reason: string): Promise<void> {
  await db.order.update({
    where: { id: internalOrderId },
    data: { status: 'FAILED', failureReason: reason.slice(0, 500) },
  })
}

// Cashfree return handler: looks up the order, verifies with the gateway, processes the order.
// Returns either a redirect URL string or null when nothing to do.
export async function handleCashfreeReturn(params: {
  orderId?: string | null
  paymentId?: string | null
}): Promise<{ redirect: string } | { error: string }> {
  const { orderId, paymentId } = params
  if (!orderId) return { error: 'missing_order' }
  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) return { error: 'order_not_found' }
  if (order.status === 'PAID') {
    return { redirect: `/payment-success?order=${order.id}` }
  }
  if (order.gateway !== 'CASHFREE') {
    await failOrder(order.id, 'Cashfree return received for non-CASHFREE order')
    return { error: 'wrong_gateway' }
  }
  if (!paymentId) {
    await failOrder(order.id, 'Cashfree return missing payment id')
    return { error: 'missing_payment_id' }
  }
  let ok = false
  try {
    ok = await verifyPayment({
      gateway: 'CASHFREE',
      gatewayOrderId: order.gatewayOrderId || order.id,
      gatewayPaymentId: paymentId,
      internalOrderId: order.id,
    })
  } catch (e) {
    console.error('cashfree return verify error', e)
  }
  if (!ok) {
    await failOrder(order.id, 'Cashfree verification failed')
    return { error: 'verify_failed' }
  }
  const result = await processPaidOrder(order.id, { gatewayPaymentId: paymentId })
  if (!result.ok) {
    return { error: 'process_failed' }
  }
  return { redirect: `/payment-success?order=${order.id}` }
}
