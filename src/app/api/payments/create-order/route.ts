import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { recomputeCartLive, readPromoCookie, fetchActivePromo, PROMO_COOKIE } from '@/lib/cart'
import { createOrder, activeGateway } from '@/lib/payments'
import { saveCartSnapshot } from '@/lib/payment-processing'

const schema = z.object({
  billingName: z.string().trim().min(1, 'Enter your name.').max(200),
  billingEmail: z.string().trim().toLowerCase().email('Enter a valid email.'),
  billingMobile: z.string().trim().min(7, 'Enter a valid mobile number.').max(20),
  billingAddress: z.string().trim().min(1, 'Enter your address.').max(500),
  billingCity: z.string().trim().min(1, 'Enter your city.').max(200),
  billingState: z.string().trim().min(1, 'Enter your state.').max(200),
  billingPincode: z.string().trim().min(3, 'Enter your pincode.').max(20),
  useWallet: z.boolean().optional().default(false),
})

// POST — create an Order at the active payment gateway.
export async function POST(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }
  const input = parsed.data

  // 1. Recompute cart from live prices (never trust the client).
  const { items, subtotal, original } = await recomputeCartLive(ctx.user.id)
  if (items.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 })
  }

  // 2. Re-validate promo (cookie)
  const promoCookie = readPromoCookie(req)
  let discount = 0
  let promoCodeId: string | null = null
  if (promoCookie) {
    const promo = await fetchActivePromo(promoCookie, subtotal)
    if (promo) {
      discount = promo.discount
      promoCodeId = promo.promoCodeId
    }
  }

  // 3. Wallet usage (use up to balance, but no more than payable)
  let walletUsed = 0
  if (input.useWallet) {
    const wallet = await db.wallet.findUnique({ where: { userId: ctx.user.id } })
    if (wallet && wallet.balance > 0) {
      const payableAfterPromo = Math.max(0, subtotal - discount)
      walletUsed = Math.min(wallet.balance, payableAfterPromo)
    }
  }

  const total = Math.max(0, subtotal - discount - walletUsed)

  // 4. Create the Order row
  const order = await db.order.create({
    data: {
      userId: ctx.user.id,
      subtotal,
      discount,
      walletUsed,
      total,
      promoCodeId,
      gateway: await activeGateway(),
      status: 'CREATED',
      billingName: input.billingName,
      billingEmail: input.billingEmail,
      billingMobile: input.billingMobile,
      billingAddress: input.billingAddress,
      billingCity: input.billingCity,
      billingState: input.billingState,
      billingPincode: input.billingPincode,
    },
  })

  // 4b. Save the cart snapshot so the verify step doesn't depend on the live cart.
  await saveCartSnapshot(order.id, items)

  // 5. Create the gateway order
  let result
  try {
    result = await createOrder({
      orderId: order.id,
      amount: total,
      customerName: input.billingName,
      customerEmail: input.billingEmail,
      customerMobile: input.billingMobile,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to create gateway order'
    await db.order.update({
      where: { id: order.id },
      data: { status: 'FAILED', failureReason: msg.slice(0, 500) },
    })
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  await db.order.update({
    where: { id: order.id },
    data: { gatewayOrderId: result.gatewayOrderId },
  })

  // Clear the promo cookie once consumed (so a re-checkout doesn't reuse it if it became invalid)
  const res = NextResponse.json({
    orderId: order.id,
    gateway: result.gateway,
    checkout: result.checkout,
  })
  res.cookies.set(PROMO_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
