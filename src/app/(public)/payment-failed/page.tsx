import Link from 'next/link'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; reason?: string }>
}) {
  const sp = await searchParams
  const settings = await getSettings()
  let order: Awaited<ReturnType<typeof db.order.findUnique>> | null = null
  if (sp.order) {
    order = await db.order.findUnique({ where: { id: sp.order } })
  }
  const reason =
    sp.reason ||
    order?.failureReason ||
    'The payment could not be verified. No money has been deducted from your account.'

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-rose-100 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-rose-600" />
          </div>
          <CardTitle className="text-xl">Payment failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center">{reason}</div>
          {order && (
            <div className="rounded-md border p-4 space-y-1 text-sm bg-muted/30">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono text-xs">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span>{order.total.toFixed(2)}</span>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button asChild className="flex-1">
              <Link href="/cart">
                Try again <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
          {settings.supportEmail && (
            <div className="text-xs text-muted-foreground text-center pt-2">
              Need help? Email us at <a href={`mailto:${settings.supportEmail}`} className="underline">{settings.supportEmail}</a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
