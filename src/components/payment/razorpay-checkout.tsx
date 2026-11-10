'use client'
import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Lock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils-extra'

// Razorpay checkout data returned by /api/payments/create-order
export interface RazorpayCheckoutData {
  keyId: string
  orderId: string
  amount: number // in paise
  currency: string
  name: string
  description: string
  prefill: { name: string; email: string; contact: string }
}

export interface RazorpayCheckoutProps {
  open: boolean
  onClose: () => void
  checkout: RazorpayCheckoutData
  internalOrderId: string
  amount: number // in INR for display
  currencySymbol: string
}

declare global {
  interface Window {
    Razorpay?: any
  }
}

let scriptPromise: Promise<boolean> | null = null
function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
  return scriptPromise
}

export function RazorpayCheckout({
  open,
  onClose,
  checkout,
  internalOrderId,
  amount,
  currencySymbol,
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rzpRef = useRef<any>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    (async () => {
      setLoading(true)
      setError(null)
      const ok = await loadRazorpayScript()
      if (cancelled) return
      if (!ok || !window.Razorpay) {
        setError('Could not load Razorpay. Please check your network and try again.')
        setLoading(false)
        return
      }
      const options = {
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: checkout.name,
        description: checkout.description,
        order_id: checkout.orderId,
        prefill: checkout.prefill,
        theme: { color: '#000000' },
        handler: async (response: any) => {
          try {
            const r = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: internalOrderId,
                gateway: 'RAZORPAY',
                gatewayPaymentId: response.razorpay_payment_id,
                gatewaySignature: response.razorpay_signature,
              }),
            })
            const data = await r.json()
            if (r.ok && data.redirect) {
              toast.success('Payment successful.')
              setTimeout(() => { window.location.href = data.redirect }, 600)
            } else {
              toast.error(data.error || 'Payment verification failed.')
              setError(data.error || 'Payment verification failed.')
            }
          } catch (e) {
            toast.error('Network error during verification.')
          }
        },
        modal: {
          ondismiss: () => {
            // user closed the gateway modal
            onClose()
          },
        },
      }
      rzpRef.current = new window.Razorpay(options)
      rzpRef.current.on('payment.failed', (resp: any) => {
        toast.error(resp?.error?.description || 'Payment failed.')
      })
      rzpRef.current.open()
      setLoading(false)
    })()
    return () => {
      cancelled = true
      try { rzpRef.current?.destroy?.() } catch {}
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Razorpay Checkout
          </DialogTitle>
          <DialogDescription>
            Pay {formatCurrency(amount, currencySymbol)} securely via Razorpay. The payment popup should open automatically.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button disabled={loading} onClick={() => rzpRef.current?.open()}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {loading ? 'Loading…' : 'Open Razorpay'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
