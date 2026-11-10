// MY CS MTP — Admin: order detail (billing, items, promo/wallet breakdown, gateway, timeline).
import Link from 'next/link'
import { notFound } from 'next/navigation'
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
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils-extra'
import {
  User,
  CreditCard,
  ReceiptText,
  MapPin,
  History,
  Ticket,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

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

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words">{value}</span>
    </div>
  )
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params
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
  if (!order) notFound()

  const dt = (d: Date) => d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  const promoValue = order.promoCode
    ? order.promoCode.type === 'PERCENT'
      ? `${order.promoCode.value}% off${order.promoCode.maxDiscount > 0 ? ` · capped at ${formatCurrency(order.promoCode.maxDiscount)}` : ''}`
      : `${formatCurrency(order.promoCode.value)} off`
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Order</h2>
          <p className="text-sm text-muted-foreground font-mono">{order.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <Badge variant="outline">{order.gateway}</Badge>
        </div>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
            Items
          </CardTitle>
          <CardDescription>{order.purchases.length} purchase row(s) created by this order.</CardDescription>
        </CardHeader>
        <CardContent>
          {order.purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase rows yet (order may still be pending).</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.plan.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.planSubject.subject.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(p.price)}</TableCell>
                      <TableCell>
                        {p.isRevoked ? (
                          <Badge variant="destructive">Revoked</Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{dt(p.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Amounts / promo + wallet breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              Amounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Promo discount</span>
              <span className="tabular-nums">−{formatCurrency(order.discount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Wallet used</span>
              <span className="tabular-nums">−{formatCurrency(order.walletUsed)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-semibold">
              <span>Total paid</span>
              <span className="tabular-nums">{formatCurrency(order.total)}</span>
            </div>
            <Separator />
            {order.promoCode && promoValue ? (
              <Detail label="Promo code" value={<span className="font-mono">{order.promoCode.code}</span>} />
            ) : (
              <Detail label="Promo code" value={<span className="text-muted-foreground">None</span>} />
            )}
            {order.promoCode && promoValue && <Detail label="Promo offer" value={promoValue} />}
            {order.status === 'FAILED' && order.failureReason && (
              <Detail label="Failure reason" value={<span className="text-destructive">{order.failureReason}</span>} />
            )}
          </CardContent>
        </Card>

        {/* Student */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Student
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Detail
              label="Name"
              value={
                <Link href={`/admin/students/${order.userId}`} className="hover:underline">
                  {order.user.name || order.user.email.split('@')[0]}
                </Link>
              }
            />
            <Detail label="Email" value={order.user.email} />
            <Detail label="Mobile" value={order.user.mobile || '—'} />
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/students/${order.userId}`}>Open student profile</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Gateway */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Gateway
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Detail label="Gateway" value={order.gateway} />
            <Detail label="Gateway order id" value={order.gatewayOrderId ? <span className="font-mono text-xs">{order.gatewayOrderId}</span> : '—'} />
            <Detail label="Gateway payment id" value={order.gatewayPaymentId ? <span className="font-mono text-xs">{order.gatewayPaymentId}</span> : '—'} />
            <Detail label="Gateway signature" value={order.gatewaySignature ? <span className="font-mono text-xs break-all">{order.gatewaySignature}</span> : '—'} />
          </CardContent>
        </Card>
      </div>

      {/* Billing details + timeline */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Billing details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Detail label="Billing name" value={order.billingName || '—'} />
            <Detail label="Billing email" value={order.billingEmail || '—'} />
            <Detail label="Billing mobile" value={order.billingMobile || '—'} />
            <Detail label="Address" value={order.billingAddress || '—'} />
            <Detail label="City" value={order.billingCity || '—'} />
            <Detail label="State" value={order.billingState || '—'} />
            <Detail label="Pincode" value={order.billingPincode || '—'} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l ml-2 space-y-6">
              <li className="ml-4">
                <span className="absolute -left-[5px] flex h-2.5 w-2.5 rounded-full bg-foreground" aria-hidden />
                <div className="text-sm font-medium">Created</div>
                <div className="text-xs text-muted-foreground">{dt(order.createdAt)}</div>
              </li>
              <li className="ml-4">
                <span className="absolute -left-[5px] flex h-2.5 w-2.5 rounded-full bg-muted-foreground" aria-hidden />
                <div className="text-sm font-medium">Last updated</div>
                <div className="text-xs text-muted-foreground">{dt(order.updatedAt)}</div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>

      <div>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/sales">← Back to sales</Link>
        </Button>
      </div>
    </div>
  )
}
