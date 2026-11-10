'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Lock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils-extra'

export interface MockCheckoutProps {
  open: boolean
  onClose: () => void
  orderId: string
  amount: number
  currencySymbol: string
  customerName?: string
  customerEmail?: string
}

export function MockCheckout({
  open,
  onClose,
  orderId,
  amount,
  currencySymbol,
  customerName,
  customerEmail,
}: MockCheckoutProps) {
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)

  async function confirm() {
    setProcessing(true)
    try {
      const r = await fetch('/api/payments/mock/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await r.json()
      if (r.ok && data.redirect) {
        setDone(true)
        toast.success('Payment successful (mock mode).')
        setTimeout(() => {
          window.location.href = data.redirect
        }, 700)
      } else {
        toast.error(data.error || 'Payment failed')
      }
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!processing && !done) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Mock Gateway (test mode)
          </DialogTitle>
          <DialogDescription>
            You are in test mode — no real money will be charged. Click below to simulate a successful payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order</span>
            <span className="font-mono text-xs">{orderId}</span>
          </div>
          {customerName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="truncate ml-2">{customerName}</span>
            </div>
          )}
          {customerEmail && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="truncate ml-2 text-xs">{customerEmail}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold pt-2 border-t mt-2">
            <span>Amount</span>
            <span>{formatCurrency(amount, currencySymbol)}</span>
          </div>
        </div>

        <DialogFooter>
          {done ? (
            <Button disabled className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Redirecting…
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={processing} className="flex-1">
                Cancel
              </Button>
              <Button onClick={confirm} disabled={processing} className="flex-1">
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Pay {formatCurrency(amount, currencySymbol)}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
