// MY CS MTP — Admin sales (orders) list API. ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const ORDER_STATUSES = new Set(['CREATED', 'PAID', 'FAILED', 'REFUNDED'])
const GATEWAYS = new Set(['RAZORPAY', 'CASHFREE', 'MOCK'])

/** "3 subjects — CSEET Unitwise, 1 subject — CS Executive Testbook" style summary. */
function itemsSummary(purchases: { plan: { name: string } }[]): string {
  const byPlan = new Map<string, number>()
  for (const p of purchases) byPlan.set(p.plan.name, (byPlan.get(p.plan.name) || 0) + 1)
  const parts: string[] = []
  for (const [plan, n] of byPlan) parts.push(`${n} ${n === 1 ? 'subject' : 'subjects'} — ${plan}`)
  return parts.join(', ')
}

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim()
  const statusParam = (u.searchParams.get('status') || '').toUpperCase()
  const gatewayParam = (u.searchParams.get('gateway') || '').toUpperCase()
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSizeRaw = parseInt(u.searchParams.get('pageSize') || '10', 10)
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 && pageSizeRaw <= 100 ? pageSizeRaw : 10

  const where = {
    ...(q
      ? {
          OR: [
            { id: { contains: q } },
            { gatewayOrderId: { contains: q } },
            { gatewayPaymentId: { contains: q } },
            { user: { email: { contains: q } } },
            { user: { name: { contains: q } } },
          ],
        }
      : {}),
    ...(ORDER_STATUSES.has(statusParam) ? { status: statusParam as never } : {}),
    ...(GATEWAYS.has(gatewayParam) ? { gateway: gatewayParam as never } : {}),
  }

  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
        createdAt: true,
        userId: true,
        user: { select: { id: true, name: true, email: true } },
        promoCode: { select: { code: true } },
        purchases: { select: { plan: { select: { name: true } } } },
        _count: { select: { purchases: true } },
      },
    }),
  ])

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    rows: orders.map((o) => ({
      id: o.id,
      student: o.user,
      itemsSummary: itemsSummary(o.purchases),
      itemCount: o._count.purchases,
      subtotal: o.subtotal,
      discount: o.discount,
      walletUsed: o.walletUsed,
      total: o.total,
      promoCode: o.promoCode?.code ?? null,
      gateway: o.gateway,
      gatewayOrderId: o.gatewayOrderId,
      gatewayPaymentId: o.gatewayPaymentId,
      status: o.status,
      createdAt: o.createdAt,
    })),
  })
}
