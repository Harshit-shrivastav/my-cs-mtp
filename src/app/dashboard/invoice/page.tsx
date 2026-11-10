// MY CS MTP — Student invoice list page.
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getCurrentUser } from '@/lib/server-auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import InvoiceListClient, { type OrderView } from '@/components/dashboard/invoice-list-client'
import { Receipt } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function InvoicePage() {
  const authed = await getCurrentUser()
  if (!authed) return null
  const settings = await getSettings()

  const orders = await db.order.findMany({
    where: { userId: authed.id },
    orderBy: { createdAt: 'desc' },
    include: {
      purchases: {
        include: {
          plan: { select: { name: true } },
          planSubject: {
            include: { subject: { select: { name: true } } },
          },
        },
      },
    },
  })

  const orderViews: OrderView[] = orders.map((o) => ({
    id: o.id,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    subtotal: o.subtotal,
    discount: o.discount,
    walletUsed: o.walletUsed,
    total: o.total,
    gateway: o.gateway,
    billingName: o.billingName,
    billingEmail: o.billingEmail,
    billingMobile: o.billingMobile,
    billingAddress: o.billingAddress,
    billingCity: o.billingCity,
    billingState: o.billingState,
    billingPincode: o.billingPincode,
    items: o.purchases.map((p) => ({
      id: p.id,
      subjectName: p.planSubject.subject.name,
      planName: p.plan.name,
      price: p.price,
    })),
  }))

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Invoice</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Your past orders. Open any order to view or print an invoice.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All orders</CardTitle>
          <CardDescription>{orderViews.length} order{orderViews.length !== 1 ? 's' : ''}.</CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceListClient
            orders={orderViews}
            currencySymbol={settings.currencySymbol}
            siteName={settings.siteName}
            supportEmail={settings.supportEmail}
            supportPhone={settings.supportPhone}
            address={settings.address}
          />
        </CardContent>
      </Card>
    </div>
  )
}
