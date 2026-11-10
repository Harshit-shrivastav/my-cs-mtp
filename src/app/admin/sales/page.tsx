// MY CS MTP — Admin sales (orders) list. Search + status/gateway filters + pagination.
import Link from 'next/link'
import { Suspense } from 'react'
import { db } from '@/lib/db'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Button } from '@/components/ui/button'
import { AdminSearch } from '@/components/admin/admin-search'
import { AdminFilterSelect, PaginationControls } from '@/components/admin/pagination-controls'
import { formatCurrency } from '@/lib/utils-extra'
import { ShoppingCart, Eye } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

const STATUS_OPTIONS = [
  { value: 'CREATED', label: 'Created' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
]

const GATEWAY_OPTIONS = [
  { value: 'RAZORPAY', label: 'Razorpay' },
  { value: 'CASHFREE', label: 'Cashfree' },
  { value: 'MOCK', label: 'Mock' },
]

function OrderStatusBadge({ status }: { status: string }) {
  if (status === 'PAID') {
    return <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">PAID</Badge>
  }
  if (status === 'FAILED') return <Badge variant="destructive">FAILED</Badge>
  if (status === 'REFUNDED') {
    return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">REFUNDED</Badge>
  }
  return <Badge variant="secondary">CREATED</Badge>
}

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminSalesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const status = (typeof sp.status === 'string' ? sp.status : '').trim()
  const gateway = (typeof sp.gateway === 'string' ? sp.gateway : '').trim()
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

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
    ...(STATUS_OPTIONS.some((o) => o.value === status) ? { status: status as never } : {}),
    ...(GATEWAY_OPTIONS.some((o) => o.value === gateway) ? { gateway: gateway as never } : {}),
  }

  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        total: true,
        discount: true,
        walletUsed: true,
        status: true,
        gateway: true,
        gatewayOrderId: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        promoCode: { select: { code: true } },
        purchases: { select: { plan: { select: { name: true } } } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Sales</h2>
        <p className="text-sm text-muted-foreground">All orders placed by students.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All orders</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center">
            <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
              <AdminSearch placeholder="Search by order id, email, or gateway id…" />
            </Suspense>
            <AdminFilterSelect param="status" placeholder="All statuses" options={STATUS_OPTIONS} />
            <AdminFilterSelect param="gateway" placeholder="All gateways" options={GATEWAY_OPTIONS} />
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No orders found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Promo</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => {
                    const byPlan = new Map<string, number>()
                    for (const p of o.purchases) byPlan.set(p.plan.name, (byPlan.get(p.plan.name) || 0) + 1)
                    const summary =
                      [...byPlan.entries()].map(([plan, n]) => `${n} ${n === 1 ? 'subject' : 'subjects'} — ${plan}`).join(', ') || '—'
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">
                          <Link href={`/admin/sales/${o.id}`} className="hover:underline">
                            {o.id}
                          </Link>
                          {o.gatewayOrderId && (
                            <div className="text-[11px] text-muted-foreground">{o.gatewayOrderId}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium leading-tight">
                            <Link href={`/admin/students/${o.user.id}`} className="hover:underline">
                              {o.user.name || o.user.email.split('@')[0]}
                            </Link>
                          </div>
                          <div className="text-xs text-muted-foreground">{o.user.email}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[16rem]">{summary}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(o.total)}
                          {(o.walletUsed > 0 || o.discount > 0) && (
                            <div className="text-[11px] text-muted-foreground">
                              {o.discount > 0 && <div>promo −{formatCurrency(o.discount)}</div>}
                              {o.walletUsed > 0 && <div>wallet −{formatCurrency(o.walletUsed)}</div>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{o.promoCode?.code || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{o.gateway}</Badge></TableCell>
                        <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {o.createdAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline" className="gap-1.5">
                            <Link href={`/admin/sales/${o.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <PaginationControls page={page} totalPages={totalPages} />
        </CardContent>
      </Card>
    </div>
  )
}
