// MY CS MTP — Admin dashboard. Summary totals, recent orders, recent signups,
// and lazy-loaded recharts (bar / line / donut).
import Link from 'next/link'
import { db } from '@/lib/db'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils-extra'
import AdminDashboardChartsLazy from '@/components/admin/dashboard-charts-lazy'
import type { MonthPoint, StatusSlice } from '@/components/admin/dashboard-charts-types'
import { statusColor } from '@/components/admin/dashboard-charts-types'
import { Users, ShoppingCart, Clock, CheckCircle2, Receipt } from 'lucide-react'

export const dynamic = 'force-dynamic'

function monthKey(d: Date): { key: string; label: string } {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return {
    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
  }
}

function buildMonthSeries(paidOrders: { createdAt: Date; total: number }[]): MonthPoint[] {
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

export default async function AdminDashboardPage() {
  const [
    studentsCount,
    paidOrdersAgg,
    ordersCount,
    ordersByGateway,
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
    db.order.groupBy({
      by: ['gateway'],
      where: { status: 'PAID' },
      _count: { _all: true },
    }),
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
        user: { select: { name: true, email: true } },
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
        course: { select: { name: true } },
      },
    }),
    db.assignment.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ])

  const totalRevenue = paidOrdersAgg._sum.total ?? 0

  const monthSeries = buildMonthSeries(paidOrdersAll)

  const statusSlices: StatusSlice[] = (['SUBMITTED', 'ASSIGNED', 'UNDER_EVALUATION', 'EVALUATED'] as const).map(
    (s) => {
      const row = assignmentStatusCounts.find((r) => r.status === s)
      return {
        name: s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' '),
        value: row?._count._all ?? 0,
        color: statusColor(s),
      }
    }
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Snapshot of the platform&apos;s activity.</p>
      </div>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Students" value={String(studentsCount)} icon={Users} tone="bg-muted" />
        <StatCard label="Total revenue" value={formatCurrency(totalRevenue)} icon={ShoppingCart} tone="bg-emerald-50 text-emerald-900 border-emerald-200" />
        <StatCard label="Orders" value={String(ordersCount)} icon={Receipt} tone="bg-sky-50 text-sky-900 border-sky-200" />
        <StatCard label="Assignments pending" value={String(assignmentsPending)} icon={Clock} tone="bg-amber-50 text-amber-900 border-amber-200" />
        <StatCard label="Assignments evaluated" value={String(assignmentsEvaluated)} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-900 border-emerald-200" />
      </div>

      {/* Orders by gateway */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Paid orders by gateway</CardTitle>
          <CardDescription>Count of PAID orders per payment gateway.</CardDescription>
        </CardHeader>
        <CardContent>
          {ordersByGateway.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid orders yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ordersByGateway.map((g) => (
                <Badge key={g.gateway} variant="outline" className="gap-1.5 px-3 py-1">
                  <span className="font-semibold">{g.gateway}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="tabular-nums">{g._count._all}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <AdminDashboardChartsLazy monthSeries={monthSeries} statusSlices={statusSlices} />

      {/* Recent orders */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent orders</CardTitle>
          <CardDescription>Latest 10 orders.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="font-medium leading-tight">{o.user.name || o.user.email.split('@')[0]}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[12rem]">{o.user.email}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatCurrency(o.total)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{o.gateway}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={o.status === 'PAID' ? 'default' : 'secondary'}>{o.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {o.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent signups */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent signups</CardTitle>
          <CardDescription>Latest 10 student registrations.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSignups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSignups.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/students/${u.id}`} className="hover:underline">
                        {u.name || u.email.split('@')[0]}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[14rem]">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{u.course?.name ?? '—'}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {u.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Users; tone: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${tone}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/70">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-semibold tabular-nums leading-none truncate">{value}</div>
        <div className="mt-1 text-xs uppercase tracking-wide opacity-80">{label}</div>
      </div>
    </div>
  )
}
