import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { verifyPayment } from '@/lib/payments'
import { processPaidOrder, failOrder } from '@/lib/payment-processing'

const schema = z.object({
  orderId: z.string().min(1),
})

// POST — Mock gateway completion. Always "succeeds" verification.
// Used only when the active gateway is MOCK.
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
  const { orderId } = parsed.data

  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order || order.userId !== ctx.user.id) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }
  if (order.status === 'PAID') {
    return NextResponse.json({ redirect: `/payment-success?order=${order.id}` })
  }
  if (order.gateway !== 'MOCK') {
    return NextResponse.json({ error: 'Mock completion is only available for MOCK orders.' }, { status: 400 })
  }

  let ok = false
  try {
    ok = await verifyPayment({
      gateway: 'MOCK',
      gatewayOrderId: order.gatewayOrderId || '',
      gatewayPaymentId: 'mock_' + order.id,
      internalOrderId: order.id,
    })
  } catch (e) {
    console.error('mock verify error', e)
    ok = false
  }
  if (!ok) {
    await failOrder(order.id, 'Mock verification failed')
    return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 })
  }

  const result = await processPaidOrder(order.id, {
    gatewayPaymentId: 'mock_' + order.id,
    gatewaySignature: null,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Could not process order.' }, { status: 500 })
  }
  return NextResponse.json({ redirect: `/payment-success?order=${order.id}` })
}
