// MY CS MTP — Admin promo codes list. Search + pagination + status badges + CRUD.
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
import { AdminSearch } from '@/components/admin/admin-search'
import { PaginationControls } from '@/components/admin/pagination-controls'
import { PromoCreateButton, PromoRowActions, type PromoRow } from '@/components/admin/promo-code-actions'
import { formatCurrency } from '@/lib/utils-extra'
import { Ticket } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

type PromoStatus = { label: string; className: string; variant: 'outline' | 'secondary' | 'destructive' }

function promoStatusOf(p: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }): PromoStatus {
  const now = new Date()
  if (!p.isActive) return { label: 'Inactive', className: '', variant: 'secondary' }
  if (p.startsAt && p.startsAt > now) {
    return { label: 'Scheduled', className: 'border-amber-200 bg-amber-50 text-amber-700', variant: 'outline' }
  }
  if (p.endsAt && p.endsAt < now) {
    return { label: 'Expired', className: 'border-amber-200 bg-amber-50 text-amber-700', variant: 'outline' }
  }
  return { label: 'Active', className: 'border-green-200 bg-green-50 text-green-700', variant: 'outline' }
}

function promoValueLabel(type: string, value: number): string {
  return type === 'PERCENT' ? `${value}%` : formatCurrency(value)
}

export default async function AdminPromoCodesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const where = q ? { code: { contains: q.toUpperCase() } } : {}

  const [total, rows] = await Promise.all([
    db.promoCode.count({ where }),
    db.promoCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        code: true,
        type: true,
        value: true,
        minAmount: true,
        maxDiscount: true,
        usageLimit: true,
        usedCount: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const dt = (d: Date) => d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Promo Codes</h2>
        <p className="text-sm text-muted-foreground">Discount codes students can apply at checkout.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All promo codes</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
              <AdminSearch placeholder="Search by code…" />
            </Suspense>
            <PromoCreateButton />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Ticket className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No promo codes found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create your first promo code to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="text-right">Min amount</TableHead>
                    <TableHead className="text-right">Max discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => {
                    const status = promoStatusOf(p)
                    const initial: PromoRow = {
                      id: p.id,
                      code: p.code,
                      type: p.type,
                      value: p.value,
                      minAmount: p.minAmount,
                      maxDiscount: p.maxDiscount,
                      usageLimit: p.usageLimit,
                      startsAt: p.startsAt ? p.startsAt.toISOString() : null,
                      endsAt: p.endsAt ? p.endsAt.toISOString() : null,
                      isActive: p.isActive,
                    }
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-sm font-medium">{p.code}</TableCell>
                        <TableCell className="tabular-nums">{promoValueLabel(p.type, p.value)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {p.minAmount > 0 ? formatCurrency(p.minAmount) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {p.maxDiscount > 0 ? formatCurrency(p.maxDiscount) : '—'}
                        </TableCell>
                        <TableCell className="tabular-nums text-xs">
                          {p.usageLimit > 0 ? `${p.usedCount}/${p.usageLimit}` : `${p.usedCount}/∞`}
                          <div className="text-[11px] text-muted-foreground">{p._count.orders} order(s)</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {p.startsAt ? dt(p.startsAt) : '—'}
                          <div>→ {p.endsAt ? dt(p.endsAt) : 'no end'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className={status.className}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <PromoRowActions promo={initial} />
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
