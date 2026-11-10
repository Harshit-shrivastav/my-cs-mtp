// MY CS MTP — Admin: single order detail API (items + user + breakdown). ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const order = await db.order.findUnique({
    where: { id },
    select: {
      id: true,
      subtotal: true,
      discount: true,
      walletUsed: true,
      total: true,
      status: true,
      gateway: true,
      gatewayOrderId: true,
      gatewayPaymentId: true,
      gatewaySignature: true,
      failureReason: true,
      billingName: true,
      billingEmail: true,
      billingMobile: true,
      billingAddress: true,
      billingCity: true,
      billingState: true,
      billingPincode: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      user: { select: { id: true, name: true, email: true, mobile: true } },
      promoCode: { select: { id: true, code: true, type: true, value: true, maxDiscount: true } },
      purchases: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          price: true,
          isRevoked: true,
          revokedAt: true,
          createdAt: true,
          plan: { select: { id: true, name: true } },
          planSubject: { select: { subject: { select: { id: true, name: true } } } },
        },
      },
    },
  })

  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

  return NextResponse.json({ order })
}
