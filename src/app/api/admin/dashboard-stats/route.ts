// MY CS MTP — Admin: dashboard stats endpoint. ADMIN-only.
// Returns counts + recent orders + recent signups + monthly aggregates
// (last 6 months of orders + revenue + assignments by status).
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

function monthKey(d: Date): { key: string; label: string } {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return {
    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
  }
}

function buildMonthSeries(paidOrders: { createdAt: Date; total: number }[]): {
  month: string
  orders: number
  revenue: number
}[] {
  const now = new Date()
  const buckets: { key: string; label: string; orders: number; revenue: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const { key, label } = monthKey(d)
    buckets.push({ key, label, orders: 0, revenue: 0 })
  }
  const map = new Map(buckets.map((b) => [b.key, b]))
  for (const o of paidOrders) {
    const { key } = monthKey(o.createdAt)
    const b = map.get(key)
    if (b) {
      b.orders += 1
      b.revenue += Math.round(o.total)
    }
  }
  return buckets.map(({ label, orders, revenue }) => ({ month: label, orders, revenue }))
}

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const [
    studentsCount,
    paidOrdersAgg,
    ordersCount,
    assignmentsPending,
    assignmentsEvaluated,
    paidOrdersAll,
    recentOrders,
    recentSignups,
    assignmentStatusCounts,
  ] = await Promise.all([
    db.user.count({ where: { role: 'STUDENT' } }),
    db.order.aggregate({ where: { status: 'PAID' }, _sum: { total: true } }),
    db.order.count(),
    db.assignment.count({
      where: { status: { in: ['SUBMITTED', 'ASSIGNED', 'UNDER_EVALUATION'] } },
    }),
    db.assignment.count({ where: { status: 'EVALUATED' } }),
    db.order.findMany({
      where: { status: 'PAID' },
      select: { createdAt: true, total: true },
    }),
    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        total: true,
        gateway: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.user.findMany({
      where: { role: 'STUDENT' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        course: { select: { id: true, name: true } },
      },
    }),
    db.assignment.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ])

  const totalRevenue = paidOrdersAgg._sum.total ?? 0
  const monthSeries = buildMonthSeries(paidOrdersAll)

  return NextResponse.json({
    totals: {
      students: studentsCount,
      totalRevenue,
      orders: ordersCount,
      assignmentsPending,
      assignmentsEvaluated,
    },
    recentOrders,
    recentSignups,
    monthSeries,
    assignmentStatusCounts: assignmentStatusCounts.map((r) => ({
      status: r.status,
      count: r._count._all,
    })),
  })
}
