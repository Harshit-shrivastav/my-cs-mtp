import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { handleCashfreeReturn } from '@/lib/payment-processing'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Cashfree return URL — the gateway redirects here after the customer completes payment.
// This server component reads query params, verifies the payment server-side, and redirects
// to /payment-success or /payment-failed.
export default async function CashfreeReturnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const orderId = typeof sp.order_id === 'string' ? sp.order_id : (typeof sp.orderId === 'string' ? sp.orderId : undefined)
  const paymentId =
    typeof sp.payment_id === 'string' ? sp.payment_id
    : typeof sp.reference_id === 'string' ? sp.reference_id
    : typeof sp.gatewayPaymentId === 'string' ? sp.gatewayPaymentId
    : undefined

  const result = await handleCashfreeReturn({ orderId, paymentId })
  if ('redirect' in result) {
    redirect(result.redirect)
  }
  redirect(`/payment-failed?order=${orderId || ''}&reason=${result.error}`)
}
