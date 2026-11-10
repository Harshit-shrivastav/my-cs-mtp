import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { verifyPayment } from '@/lib/payments'
import { processPaidOrder } from '@/lib/payment-processing'

// POST — Razorpay / Cashfree webhook.
// Razorpay: verify X-Razorpay-Signature against the raw body.
// Cashfree: signature verification skipped here (we use the return-URL verify path).
// Idempotent — if the order is already PAID, returns 200 OK.
export async function POST(req: Request) {
  const raw = await req.text()
  const sig = req.headers.get('x-razorpay-signature') || ''

  // Parse minimal fields from body. Both gateways send `order_id` (internal) — Razorpay puts it
  // inside `payload.payment.entity.order_id` which is the *gateway* order id; we look up by that.
  let parsed: any = null
  try { parsed = JSON.parse(raw) } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Razorpay signature verification
  if (sig && process.env.RAZORPAY_KEY_SECRET) {
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(raw).digest('hex')
    if (expected !== sig) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  // Find the internal order. Razorpay sends payload.payment.entity.order_id (= gateway order id).
  // Cashfree sends orderId (the internal id we set as order_id at gateway creation).
  let gatewayOrderId: string | null = null
  let internalOrderId: string | null = null
  let gatewayPaymentId: string | null = null
  let gateway: 'RAZORPAY' | 'CASHFREE' = 'RAZORPAY'

  if (parsed?.payload?.payment?.entity) {
    const e = parsed.payload.payment.entity
    gatewayOrderId = e.order_id
    gatewayPaymentId = e.id
    gateway = 'RAZORPAY'
  } else if (parsed?.data?.order?.order_id || parsed?.data?.payment?.cf_payment_id) {
    gateway = 'CASHFREE'
    internalOrderId = parsed.data.order?.order_id || null
    gatewayPaymentId = parsed.data.payment?.cf_payment_id || null
    gatewayOrderId = internalOrderId
  }

  let order
  if (internalOrderId) {
    order = await db.order.findUnique({ where: { id: internalOrderId } })
  } else if (gatewayOrderId) {
    order = await db.order.findFirst({ where: { gatewayOrderId } })
  }
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.status === 'PAID') {
    return NextResponse.json({ ok: true, alreadyPaid: true })
  }
  if (!gatewayPaymentId) {
    return NextResponse.json({ error: 'No payment id' }, { status: 400 })
  }

  let ok = false
  try {
    ok = await verifyPayment({
      gateway,
      gatewayOrderId: order.gatewayOrderId || order.id,
      gatewayPaymentId,
      internalOrderId: order.id,
    })
  } catch (e) {
    console.error('webhook verify error', e)
  }
  if (!ok) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
  }
  const result = await processPaidOrder(order.id, { gatewayPaymentId })
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'process failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
