'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Save, Sparkles } from 'lucide-react'

export interface PromotionalWalletFormProps {
  promoWalletAmount: number
  promoWalletRules: string
}

export function PromotionalWalletForm(props: PromotionalWalletFormProps) {
  const router = useRouter()
  const [amount, setAmount] = useState(String(props.promoWalletAmount))
  const [rules, setRules] = useState(props.promoWalletRules)
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const num = Number(amount)
    if (!Number.isInteger(num) || num < 0) {
      toast.error('Enter a valid whole-number amount (₹).')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/admin/promotional-wallet', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoWalletAmount: num, promoWalletRules: rules }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed to save promotional wallet config.')
      toast.success('Promotional wallet settings saved.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save promotional wallet config.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Promotional wallet credit</CardTitle>
        <CardDescription>
          Promotional wallet credit given to new students (shown with its rules on signup-related
          surfaces).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="promo-wallet-amount">Amount (₹, whole number)</Label>
            <Input
              id="promo-wallet-amount"
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promo-wallet-rules">Promotional wallet rules (shown to students)</Label>
            <Textarea
              id="promo-wallet-rules"
              rows={4}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Promotional wallet credit is added on signup and is non-refundable."
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function PromoWalletBehaviorNote({ wiredOnSignup }: { wiredOnSignup: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium text-foreground">Current behavior</p>
        {wiredOnSignup ? (
          <p>
            The signup flow (<span className="font-mono">src/app/api/auth/signup/route.ts</span>)
            credits this amount to each new student&apos;s wallet when they create an account. The
            credit is a wallet transaction and is non-refundable per the rules above.
          </p>
        ) : (
          <p>
            The signup flow (<span className="font-mono">src/app/api/auth/signup/route.ts</span>)
            does <span className="font-medium text-foreground">not</span> credit this amount yet —
            the configured value and rules are stored as site settings and available to any surface
            that needs them, but no wallet credit is applied automatically at signup. Wire the
            credit into signup to activate it.
          </p>
        )}
      </div>
    </div>
  )
}
