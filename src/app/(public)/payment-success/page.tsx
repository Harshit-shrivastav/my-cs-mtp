import Link from 'next/link'
import { getCurrentUser } from '@/lib/server-auth'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, ArrowRight, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils-extra'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const sp = await searchParams
  const orderId = sp.order
  if (!orderId) redirect('/')

  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/cart')

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      purchases: {
        include: {
          plan: { select: { name: true } },
          planSubject: { include: { subject: { select: { name: true } } } },
        },
      },
    },
  })
  if (!order || order.userId !== user.id) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Order not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/cart">Back to cart</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const settings = await getSettings()
  const gatewayLabel = order.gateway === 'RAZORPAY' ? 'Razorpay' : order.gateway === 'CASHFREE' ? 'Cashfree' : 'Mock gateway (test mode)'

  // Allow this page even if the order is not yet PAID — show a waiting state.
  // But if it's FAILED, redirect to the failure page.
  if (order.status === 'FAILED') {
    redirect(`/payment-failed?order=${order.id}`)
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <CardTitle className="text-xl">Payment successful</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center">
            Thank you, {user.name || user.email.split('@')[0]}! Your purchase is ready.
          </div>
          <div className="rounded-md border p-4 space-y-2 text-sm bg-muted/30">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono text-xs">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount paid</span>
              <span className="font-semibold">{formatCurrency(order.total, settings.currencySymbol)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment gateway</span>
              <span>{gatewayLabel}</span>
            </div>
            {order.gatewayPaymentId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment ref</span>
                <span className="font-mono text-xs">{order.gatewayPaymentId}</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Package className="h-4 w-4" />
              Items purchased ({order.purchases.length})
            </div>
            <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
              {order.purchases.map((p) => (
                <li key={p.id} className="text-sm flex justify-between gap-2 border-b pb-1.5">
                  <span className="truncate">
                    {p.planSubject.subject.name} — {p.plan.name}
                  </span>
                  <span className="text-muted-foreground shrink-0">{formatCurrency(p.price, settings.currencySymbol)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button asChild className="flex-1">
              <Link href="/dashboard">
                Go to Test Series <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
