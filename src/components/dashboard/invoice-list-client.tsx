'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Receipt, Printer, ExternalLink, Eye } from 'lucide-react'
import { formatCurrency } from '@/lib/utils-extra'

export interface OrderItem {
  id: string
  subjectName: string
  planName: string
  price: number
}

export interface OrderView {
  id: string
  createdAt: string
  status: string
  subtotal: number
  discount: number
  walletUsed: number
  total: number
  gateway: string
  billingName: string | null
  billingEmail: string | null
  billingMobile: string | null
  billingAddress: string | null
  billingCity: string | null
  billingState: string | null
  billingPincode: string | null
  items: OrderItem[]
}

interface InvoiceListClientProps {
  orders: OrderView[]
  currencySymbol: string
  siteName: string
  supportEmail: string
  supportPhone: string
  address: string
}

export default function InvoiceListClient({
  orders,
  currencySymbol,
  siteName,
  supportEmail,
  supportPhone,
  address,
}: InvoiceListClientProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const active = orders.find((o) => o.id === openId) || null

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <Receipt className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No orders yet. Your purchase history will appear here.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/pricing">Browse plans</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-md border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-1 text-sm">
                  <span className="font-semibold">{formatCurrency(o.total, currencySymbol)}</span>
                  <span className="text-muted-foreground"> · {o.items.length} item{o.items.length !== 1 ? 's' : ''}</span>
                  <span className="text-muted-foreground"> · {o.gateway}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setOpenId(o.id)}>
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/invoice/${o.id}`} target="_blank">
                    <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!active} onOpenChange={(o) => setOpenId(o ? active?.id ?? null : null)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Invoice preview</DialogTitle>
            <DialogDescription>
              For order <span className="font-mono">{active?.id}</span>
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <InvoiceBody
                order={active}
                currencySymbol={currencySymbol}
                siteName={siteName}
                supportEmail={supportEmail}
                supportPhone={supportPhone}
                address={address}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenId(null)}>Close</Button>
            {active && (
              <Button asChild>
                <Link href={`/dashboard/invoice/${active.id}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open printable page
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'PAID' ? 'bg-emerald-100 text-emerald-800'
    : status === 'FAILED' ? 'bg-rose-100 text-rose-700'
    : status === 'REFUNDED' ? 'bg-amber-100 text-amber-800'
    : 'bg-muted text-muted-foreground'
  return <Badge variant="secondary" className={`text-[10px] ${color}`}>{status}</Badge>
}

export function InvoiceBody({
  order,
  currencySymbol,
  siteName,
  supportEmail,
  supportPhone,
  address,
}: {
  order: OrderView
  currencySymbol: string
  siteName: string
  supportEmail: string
  supportPhone: string
  address: string
}) {
  const fmt = (n: number) => formatCurrency(n, currencySymbol)
  return (
    <div className="space-y-5 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold">{siteName}</div>
          <div className="text-xs text-muted-foreground">{address}</div>
          <div className="text-xs text-muted-foreground">{supportEmail} · {supportPhone}</div>
        </div>
        <div className="text-right">
          <div className="text-base font-semibold">Invoice</div>
          <div className="text-xs text-muted-foreground font-mono">{order.id}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Billed to</div>
        <div className="text-sm">
          <div>{order.billingName || '—'}</div>
          {order.billingEmail && <div className="text-muted-foreground text-xs">{order.billingEmail}</div>}
          {order.billingMobile && <div className="text-muted-foreground text-xs">{order.billingMobile}</div>}
          {order.billingAddress && (
            <div className="text-muted-foreground text-xs mt-1">
              {order.billingAddress}
              {(order.billingCity || order.billingState) && (
                <div>
                  {[order.billingCity, order.billingState].filter(Boolean).join(', ')}
                  {order.billingPincode ? ` - ${order.billingPincode}` : ''}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Items</div>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium">Subject</th>
                <th className="text-left px-3 py-2 text-xs font-medium">Plan</th>
                <th className="text-right px-3 py-2 text-xs font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2">{it.subjectName}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{it.planName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(it.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <Line label="Subtotal" value={fmt(order.subtotal)} />
        {order.discount > 0 && <Line label="Discount" value={`- ${fmt(order.discount)}`} muted />}
        {order.walletUsed > 0 && <Line label="Wallet credit used" value={`- ${fmt(order.walletUsed)}`} muted />}
        <div className="border-t pt-2 mt-2 flex items-center justify-between">
          <span className="font-semibold">Total paid</span>
          <span className="font-bold tabular-nums">{fmt(order.total)}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Paid via <span className="font-medium text-foreground">{order.gateway}</span>
        </div>
      </div>
    </div>
  )
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-muted-foreground' : ''}>{label}</span>
      <span className={`tabular-nums ${muted ? 'text-muted-foreground' : ''}`}>{value}</span>
    </div>
  )
}
