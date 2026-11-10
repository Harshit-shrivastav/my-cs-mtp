'use client'

import { useMemo, useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Save, ShieldCheck, ShieldAlert, Info } from 'lucide-react'

export interface PaymentGatewayFormProps {
  activePaymentGateway: string
  paymentMode: string
  razorpayEnabled: boolean
  cashfreeEnabled: boolean
  razorpayConfigured: boolean
  cashfreeConfigured: boolean
  effectiveGateway: string
  tableRowInSync: boolean
}

const GATEWAY_LABELS: Record<string, string> = {
  RAZORPAY: 'Razorpay',
  CASHFREE: 'Cashfree',
  MOCK: 'Mock (dev only)',
}

export function PaymentGatewayForm(props: PaymentGatewayFormProps) {
  const router = useRouter()
  const [gateway, setGateway] = useState(props.activePaymentGateway)
  const [mode, setMode] = useState(props.paymentMode)
  const [razorpayEnabled, setRazorpayEnabled] = useState(props.razorpayEnabled)
  const [cashfreeEnabled, setCashfreeEnabled] = useState(props.cashfreeEnabled)
  const [busy, setBusy] = useState(false)

  const enabledMap = useMemo(
    () => ({ RAZORPAY: razorpayEnabled, CASHFREE: cashfreeEnabled, MOCK: true }),
    [razorpayEnabled, cashfreeEnabled]
  )

  // Non-blocking warning: gateway enabled but env keys missing.
  const envWarnings = useMemo(() => {
    const w: string[] = []
    if (razorpayEnabled && !props.razorpayConfigured) {
      w.push('Razorpay is enabled but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set in .env — live checkout will still fall back to Mock.')
    }
    if (cashfreeEnabled && !props.cashfreeConfigured) {
      w.push('Cashfree is enabled but CASHFREE_APP_ID / CASHFREE_SECRET_KEY are not set in .env — live checkout will still fall back to Mock.')
    }
    return w
  }, [razorpayEnabled, cashfreeEnabled, props.razorpayConfigured, props.cashfreeConfigured])

  // Blocking error: active gateway must be one of the enabled ones (or MOCK).
  const activeNotEnabled = gateway !== 'MOCK' && !enabledMap[gateway]

  async function save() {
    if (activeNotEnabled) {
      toast.error(
        `Active gateway must be one of the enabled gateways (or MOCK). "${GATEWAY_LABELS[gateway] || gateway}" is not enabled.`
      )
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/admin/payment-gateway', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activePaymentGateway: gateway,
          paymentMode: mode,
          razorpayEnabled,
          cashfreeEnabled,
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed to save payment gateway settings.')
      const warnings: string[] = data.warnings || []
      if (warnings.length > 0) {
        toast.warning('Saved with warnings', { description: warnings.join(' ') })
      } else {
        toast.success('Payment gateway settings saved.')
      }
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save payment gateway settings.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Checkout gateway</CardTitle>
        <CardDescription>
          Choose which payment gateway processes checkout, its mode, and which gateways are
          enabled. Keys/secrets live in <span className="font-mono">.env</span> — they are never
          stored in the database or shown here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="active-gateway">Active gateway</Label>
            <Select value={gateway} onValueChange={setGateway}>
              <SelectTrigger id="active-gateway" className="w-full">
                <SelectValue placeholder="Select gateway" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GATEWAY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeNotEnabled && (
              <p className="text-xs text-destructive">
                “{GATEWAY_LABELS[gateway]}” is not enabled below — enable it first or pick another active gateway.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-mode">Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger id="payment-mode" className="w-full">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SANDBOX">Sandbox (test)</SelectItem>
                <SelectItem value="PRODUCTION">Production (live)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sandbox uses test API endpoints (applies to Cashfree; Razorpay keys are account-scoped).
            </p>
          </div>
        </div>

        <Separator />

        {/* Razorpay */}
        <GatewayToggle
          name="Razorpay"
          enabled={razorpayEnabled}
          onEnabledChange={setRazorpayEnabled}
          configured={props.razorpayConfigured}
          configuredText="RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set."
          notConfiguredText="Not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"
          disabledReason={props.razorpayConfigured ? undefined : 'Add the env keys to make this gateway usable at checkout.'}
        />

        {/* Cashfree */}
        <GatewayToggle
          name="Cashfree"
          enabled={cashfreeEnabled}
          onEnabledChange={setCashfreeEnabled}
          configured={props.cashfreeConfigured}
          configuredText="CASHFREE_APP_ID and CASHFREE_SECRET_KEY are set."
          notConfiguredText="Not configured — set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in .env"
          disabledReason={props.cashfreeConfigured ? undefined : 'Add the env keys to make this gateway usable at checkout.'}
        />

        <Separator />

        {envWarnings.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                {envWarnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
                <p className="text-xs opacity-80">You can still save — the admin may add the env keys later.</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Effective gateway at checkout:
            </span>
            <Badge variant={props.effectiveGateway === 'MOCK' ? 'secondary' : 'default'}>
              {GATEWAY_LABELS[props.effectiveGateway] || props.effectiveGateway}
            </Badge>
            {props.effectiveGateway === 'MOCK' && (
              <span className="text-destructive">
                (no real charge — payments auto-succeed in Mock mode)
              </span>
            )}
          </div>
          <Button onClick={save} disabled={busy || activeNotEnabled} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface GatewayToggleProps {
  name: string
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  configured: boolean
  configuredText: string
  notConfiguredText: string
  disabledReason?: string
}

function GatewayToggle({
  name,
  enabled,
  onEnabledChange,
  configured,
  configuredText,
  notConfiguredText,
  disabledReason,
}: GatewayToggleProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          {configured ? (
            <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
              <ShieldCheck className="h-3 w-3" />
              Configured
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="h-3 w-3" />
              Not configured
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{configured ? configuredText : notConfiguredText}</p>
        {enabled && !configured && disabledReason && (
          <p className="text-xs text-destructive">{disabledReason}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Switch id={`${name}-enabled`} checked={enabled} onCheckedChange={onEnabledChange} />
        <Label htmlFor={`${name}-enabled`} className="text-xs text-muted-foreground">
          {enabled ? 'Enabled' : 'Disabled'}
        </Label>
      </div>
    </div>
  )
}
