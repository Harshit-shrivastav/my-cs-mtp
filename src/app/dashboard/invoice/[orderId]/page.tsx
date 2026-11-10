// MY CS MTP — Printable invoice view at /dashboard/invoice/[orderId].
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getCurrentUser } from '@/lib/server-auth'
import { Button } from '@/components/ui/button'
import { InvoiceBody, type OrderView } from '@/components/dashboard/invoice-list-client'
import PrintButton from '@/components/dashboard/print-button'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ orderId: string }>
}

export default async function PrintableInvoicePage({ params }: PageProps) {
  const { orderId } = await params
  const authed = await getCurrentUser()
  if (!authed) return null
  const settings = await getSettings()

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

  if (!order || order.userId !== authed.id) {
    notFound()
  }

  const orderView: OrderView = {
    id: order.id,
    createdAt: order.createdAt.toISOString(),
    status: order.status,
    subtotal: order.subtotal,
    discount: order.discount,
    walletUsed: order.walletUsed,
    total: order.total,
    gateway: order.gateway,
    billingName: order.billingName,
    billingEmail: order.billingEmail,
    billingMobile: order.billingMobile,
    billingAddress: order.billingAddress,
    billingCity: order.billingCity,
    billingState: order.billingState,
    billingPincode: order.billingPincode,
    items: order.purchases.map((p) => ({
      id: p.id,
      subjectName: p.planSubject.subject.name,
      planName: p.plan.name,
      price: p.price,
    })),
  }

  return (
    <div className="space-y-4">
      {/* On-screen header — hidden on print */}
      <div className="no-print flex items-center justify-between gap-3 flex-wrap">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/invoice"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to invoices</Link>
        </Button>
        <PrintButton />
      </div>

      <div className="invoice-print rounded-md border bg-background p-6 sm:p-8">
        <InvoiceBody
          order={orderView}
          currencySymbol={settings.currencySymbol}
          siteName={settings.siteName}
          supportEmail={settings.supportEmail}
          supportPhone={settings.supportPhone}
          address={settings.address}
        />
      </div>

      {/* Print CSS — hide dashboard chrome */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide the dashboard chrome (sidebar, topbar) and on-screen controls */
          aside, .no-print, button { display: none !important; }
          /* Reset layout so the invoice uses the full page */
          html, body { background: #ffffff !important; }
          main { padding: 0 !important; }
          /* Remove the card border for a clean print */
          .invoice-print { border: 0 !important; box-shadow: none !important; padding: 0 !important; }
          @page { margin: 12mm; }
        }
      `}} />
    </div>
  )
}
