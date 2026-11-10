import { NextResponse } from 'next/server'
import { handleCashfreeReturn } from '@/lib/payment-processing'

// GET — Cashfree return URL handler (public — ownership verified via gateway).
export async function GET(req: Request) {
  const url = new URL(req.url)
  const orderId = url.searchParams.get('order_id') || url.searchParams.get('orderId')
  const paymentId =
    url.searchParams.get('payment_id') ||
    url.searchParams.get('reference_id') ||
    url.searchParams.get('gatewayPaymentId')

  const result = await handleCashfreeReturn({ orderId, paymentId })
  if ('redirect' in result) {
    return NextResponse.redirect(new URL(result.redirect, url.origin))
  }
  return NextResponse.redirect(
    new URL(`/payment-failed?order=${orderId || ''}&reason=${result.error}`, url.origin)
  )
}
