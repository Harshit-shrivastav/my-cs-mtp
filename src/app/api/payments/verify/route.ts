import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { verifyPayment, GatewayName } from '@/lib/payments'
import { processPaidOrder, failOrder } from '@/lib/payment-processing'

const schema = z.object({
  orderId: z.string().min(1),
  gatewayPaymentId: z.string().min(1),
  gatewaySignature: z.string().optional(),
  gateway: z.enum(['RAZORPAY', 'CASHFREE', 'MOCK']),
})

// POST — verify a payment after the client gets a success callback from the gateway.
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
  const { orderId, gatewayPaymentId, gatewaySignature, gateway } = parsed.data

  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order || order.userId !== ctx.user.id) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }
  if (order.status === 'PAID') {
    return NextResponse.json({ redirect: `/payment-success?order=${order.id}` })
  }
  if (!order.gatewayOrderId) {
    return NextResponse.json({ error: 'Missing gateway order id.' }, { status: 400 })
  }

  let ok = false
  try {
    ok = await verifyPayment({
      gateway: gateway as GatewayName,
      gatewayOrderId: order.gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature,
      internalOrderId: order.id,
    })
  } catch (e) {
    console.error('verifyPayment error', e)
    ok = false
  }

  if (!ok) {
    await failOrder(order.id, 'Signature verification failed')
    return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 })
  }

  const result = await processPaidOrder(order.id, { gatewayPaymentId, gatewaySignature })
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Could not process order.' }, { status: 500 })
  }
  return NextResponse.json({ redirect: `/payment-success?order=${order.id}` })
}
