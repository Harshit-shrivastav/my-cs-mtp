'use client'
import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Lock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils-extra'

// Cashfree checkout data returned by /api/payments/create-order
export interface CashfreeCheckoutData {
  paymentSessionId: string
  orderId: string
  appId: string
  env: 'production' | 'sandbox'
}

export interface CashfreeCheckoutProps {
  open: boolean
  onClose: () => void
  checkout: CashfreeCheckoutData
  internalOrderId: string
  amount: number // in INR for display
  currencySymbol: string
}

declare global {
  interface Window {
    Cashfree?: any
  }
}

let scriptPromise: Promise<boolean> | null = null
function loadCashfreeScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Cashfree) return Promise.resolve(true)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
    s.async = true
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
  return scriptPromise
}

export function CashfreeCheckout({
  open,
  onClose,
  checkout,
  internalOrderId,
  amount,
  currencySymbol,
}: CashfreeCheckoutProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cfRef = useRef<any>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    (async () => {
      setLoading(true)
      setError(null)
      const ok = await loadCashfreeScript()
      if (cancelled) return
      if (!ok || !window.Cashfree) {
        setError('Could not load Cashfree. Please check your network and try again.')
        setLoading(false)
        return
      }
      try {
        cfRef.current = window.Cashfree({ env: checkout.env })
        cfRef.current.checkout({
          paymentSessionId: checkout.paymentSessionId,
          redirectTarget: '_self',
        })
      } catch (e) {
        console.error('cashfree checkout error', e)
        setError('Could not start Cashfree checkout.')
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Cashfree Checkout
          </DialogTitle>
          <DialogDescription>
            Pay {formatCurrency(amount, currencySymbol)} securely via Cashfree. The payment page should open automatically.
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
          <Button
            disabled={loading}
            onClick={async () => {
              if (!cfRef.current) return
              try {
                cfRef.current.checkout({
                  paymentSessionId: checkout.paymentSessionId,
                  redirectTarget: '_self',
                })
              } catch (e) {
                toast.error('Could not open Cashfree.')
              }
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {loading ? 'Loading…' : 'Open Cashfree'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
