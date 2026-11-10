'use client'
import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Trash2, ShoppingBag, Loader2, Tag, X, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { notifyCartChanged } from '@/components/cart/cart-context'
import { formatCurrency } from '@/lib/utils-extra'
import { MockCheckout } from '@/components/payment/mock-checkout'
import { RazorpayCheckout, RazorpayCheckoutData } from '@/components/payment/razorpay-checkout'
import { CashfreeCheckout, CashfreeCheckoutData } from '@/components/payment/cashfree-checkout'
import type { CartLineItem } from '@/lib/cart'

interface AppliedPromo {
  promoCodeId: string
  code: string
  type: 'PERCENT' | 'FLAT'
  value: number
  minAmount: number
  maxDiscount: number
  discount: number
  discountLabel: string
}

interface CartPageClientProps {
  user: { id: string; email: string; name: string | null; mobile: string | null }
  items: CartLineItem[]
  totals: { subtotal: number; original: number }
  walletBalance: number
  currencySymbol: string
  gateway: 'RAZORPAY' | 'CASHFREE' | 'MOCK'
  gatewayLabel: string
  appliedPromo: AppliedPromo | null
}

interface BillingForm {
  billingName: string
  billingEmail: string
  billingMobile: string
  billingAddress: string
  billingCity: string
  billingState: string
  billingPincode: string
}

export function CartPageClient({
  user,
  items: initialItems,
  totals: initialTotals,
  walletBalance: initialWalletBalance,
  currencySymbol,
  gateway,
  gatewayLabel,
  appliedPromo: initialPromo,
}: CartPageClientProps) {
  const [items, setItems] = useState<CartLineItem[]>(initialItems)
  const [totals, setTotals] = useState(initialTotals)
  const [walletBalance, setWalletBalance] = useState(initialWalletBalance)
  const [promo, setPromo] = useState<AppliedPromo | null>(initialPromo)
  const [promoCode, setPromoCode] = useState('')
  const [promoBusy, setPromoBusy] = useState(false)
  const [useWallet, setUseWallet] = useState(false)
  const [paying, setPaying] = useState(false)
  const [billing, setBilling] = useState<BillingForm>({
    billingName: user.name || '',
    billingEmail: user.email,
    billingMobile: user.mobile || '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingPincode: '',
  })

  // Checkout modal state
  const [checkoutState, setCheckoutState] = useState<
    | null
    | { mode: 'MOCK'; orderId: string; amount: number }
    | { mode: 'RAZORPAY'; orderId: string; amount: number; checkout: RazorpayCheckoutData }
    | { mode: 'CASHFREE'; orderId: string; amount: number; checkout: CashfreeCheckoutData }
  >(null)

  // Derived totals
  const discount = promo?.discount ?? 0
  const payableBeforeWallet = Math.max(0, totals.subtotal - discount)
  const walletUsed = useWallet ? Math.min(walletBalance, payableBeforeWallet) : 0
  const payable = Math.max(0, payableBeforeWallet - walletUsed)

  const fmt = (n: number) => formatCurrency(n, currencySymbol)

  const refreshCart = useCallback(async () => {
    const r = await fetch('/api/cart', { method: 'GET' })
    const data = await r.json()
    if (r.ok) {
      setItems(data.items || [])
      setTotals(data.totals || { subtotal: 0, original: 0 })
      // If promo no longer valid against new subtotal, drop it
      if (promo && data.totals?.subtotal < promo.minAmount) {
        setPromo(null)
      }
    }
    // Also refresh wallet balance
    const me = await fetch('/api/auth/me').then((r) => r.json())
    if (me?.id) {
      // Wallet isn't returned by /me; refetch by re-fetching this page is expensive.
      // We just trust the server's last-known balance for display.
    }
  }, [promo])

  async function removeItem(itemId: string) {
    const r = await fetch('/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartItemId: itemId }),
    })
    if (r.ok) {
      const data = await r.json()
      await refreshCart()
      notifyCartChanged()
      toast.success('Removed from cart.')
    } else {
      const data = await r.json()
      toast.error(data.error || 'Could not remove item.')
    }
  }

  async function applyPromo() {
    if (!promoCode.trim()) {
      toast.error('Enter a promo code.')
      return
    }
    setPromoBusy(true)
    try {
      const r = await fetch('/api/cart/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim() }),
      })
      const data = await r.json()
      if (r.ok) {
        // Re-fetch the applied promo's full details by re-querying the server.
        // The server returns { code, discount, discountLabel } — we approximate the rest.
        setPromo({
          promoCodeId: '',
          code: data.code,
          type: 'FLAT', // not returned — server re-validates at checkout anyway
          value: 0,
          minAmount: 0,
          maxDiscount: 0,
          discount: data.discount,
          discountLabel: data.discountLabel,
        })
        toast.success(`Promo "${data.code}" applied — ${data.discountLabel}.`)
        setPromoCode('')
      } else {
        toast.error(data.error || 'Could not apply promo.')
      }
    } finally {
      setPromoBusy(false)
    }
  }

  async function removePromo() {
    setPromoBusy(true)
    try {
      await fetch('/api/cart/promo', { method: 'DELETE' })
      setPromo(null)
      toast.success('Promo code removed.')
    } finally {
      setPromoBusy(false)
    }
  }

  // Group items by subject → plan + course
  const grouped = useMemo(() => {
    // Group by planId for compactness, but spec says "Subject — Plan (Course)"
    return items.map((it) => ({
      ...it,
      label: `${it.subjectName} — ${it.planName} (${it.courseName})`,
    }))
  }, [items])

  function validateBilling(): string | null {
    const b = billing
    if (!b.billingName.trim()) return 'Enter your name.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.billingEmail)) return 'Enter a valid billing email.'
    if (b.billingMobile.replace(/[^0-9]/g, '').length < 7) return 'Enter a valid mobile number.'
    if (!b.billingAddress.trim()) return 'Enter your address.'
    if (!b.billingCity.trim()) return 'Enter your city.'
    if (!b.billingState.trim()) return 'Enter your state.'
    if (b.billingPincode.replace(/[^0-9A-Za-z]/g, '').length < 3) return 'Enter a valid pincode.'
    return null
  }

  async function payNow() {
    if (items.length === 0) {
      toast.error('Your cart is empty.')
      return
    }
    const v = validateBilling()
    if (v) {
      toast.error(v)
      return
    }
    if (payable <= 0) {
      toast.error('Payable amount is zero. Please remove your wallet usage if you want to test the gateway.')
      return
    }
    setPaying(true)
    try {
      const r = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingName: billing.billingName,
          billingEmail: billing.billingEmail,
          billingMobile: billing.billingMobile,
          billingAddress: billing.billingAddress,
          billingCity: billing.billingCity,
          billingState: billing.billingState,
          billingPincode: billing.billingPincode,
          useWallet,
        }),
      })
      const data = await r.json()
      if (!r.ok) {
        toast.error(data.error || 'Could not start checkout.')
        setPaying(false)
        return
      }
      const { orderId, gateway: gw, checkout } = data
      if (gw === 'MOCK') {
        setCheckoutState({ mode: 'MOCK', orderId, amount: payable })
      } else if (gw === 'RAZORPAY') {
        setCheckoutState({ mode: 'RAZORPAY', orderId, amount: payable, checkout: checkout as RazorpayCheckoutData })
      } else if (gw === 'CASHFREE') {
        setCheckoutState({ mode: 'CASHFREE', orderId, amount: payable, checkout: checkout as CashfreeCheckoutData })
      } else {
        toast.error('Unknown gateway: ' + gw)
        setPaying(false)
      }
    } catch (e) {
      console.error(e)
      toast.error('Network error. Please try again.')
      setPaying(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Your cart is empty
            </CardTitle>
            <CardDescription>
              Browse our CS test series and pick the subjects you want to start.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Browse test series</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-8 pb-28 lg:pb-8 max-w-6xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Your cart</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT: items + billing */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cart items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items ({items.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {grouped.map((it) => (
                <div key={it.id} className="flex items-start justify-between gap-3 p-3 rounded-md border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-snug break-words">{it.label}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-semibold text-sm">{fmt(it.priceSnapshot)}</span>
                      {it.originalPriceSnapshot > it.priceSnapshot && (
                        <span className="text-xs text-muted-foreground line-through">{fmt(it.originalPriceSnapshot)}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeItem(it.id)}
                    aria-label={`Remove ${it.subjectName}`}
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Promo + wallet */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Discounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="promo">Promo code</Label>
                {promo ? (
                  <div className="flex items-center justify-between gap-2 flex-wrap rounded-md border border-dashed bg-muted/40 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <Tag className="h-4 w-4 shrink-0" />
                      <span className="font-mono text-sm font-medium break-all">{promo.code}</span>
                      <Badge variant="secondary" className="text-xs">{promo.discountLabel}</Badge>
                    </div>
                    <Button size="sm" variant="ghost" onClick={removePromo} disabled={promoBusy} aria-label="Remove promo">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="promo"
                      className="flex-1 min-w-0"
                      placeholder="e.g. WELCOME10"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') applyPromo() }}
                    />
                    <Button className="shrink-0" onClick={applyPromo} disabled={promoBusy} variant="outline">
                      {promoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="useWallet" className="cursor-pointer">
                    Use wallet balance
                  </Label>
                  <Badge variant="outline">{fmt(walletBalance)} available</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="useWallet"
                    checked={useWallet}
                    onCheckedChange={(v) => setUseWallet(Boolean(v))}
                    disabled={walletBalance <= 0}
                  />
                  <span className="text-sm text-muted-foreground">
                    {walletBalance <= 0
                      ? 'No wallet balance available.'
                      : `Apply up to ${fmt(Math.min(walletBalance, payableBeforeWallet))} from your wallet.`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Billing details</CardTitle>
              <CardDescription>Required for invoice generation.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="billingName">Name</Label>
                <Input
                  id="billingName"
                  value={billing.billingName}
                  onChange={(e) => setBilling({ ...billing, billingName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingEmail">Email</Label>
                <Input
                  id="billingEmail"
                  type="email"
                  value={billing.billingEmail}
                  onChange={(e) => setBilling({ ...billing, billingEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingMobile">Mobile</Label>
                <Input
                  id="billingMobile"
                  value={billing.billingMobile}
                  onChange={(e) => setBilling({ ...billing, billingMobile: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="billingAddress">Address</Label>
                <Input
                  id="billingAddress"
                  value={billing.billingAddress}
                  onChange={(e) => setBilling({ ...billing, billingAddress: e.target.value })}
                  placeholder="House no., street, area"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingCity">City</Label>
                <Input
                  id="billingCity"
                  value={billing.billingCity}
                  onChange={(e) => setBilling({ ...billing, billingCity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingState">State</Label>
                <Input
                  id="billingState"
                  value={billing.billingState}
                  onChange={(e) => setBilling({ ...billing, billingState: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingPincode">Pincode</Label>
                <Input
                  id="billingPincode"
                  value={billing.billingPincode}
                  onChange={(e) => setBilling({ ...billing, billingPincode: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: order summary */}
        <div className="space-y-6">
          <Card className="lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="text-base">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{fmt(totals.subtotal)}</span>
              </div>
              {totals.original > totals.subtotal && (
                <div className="flex justify-between text-muted-foreground">
                  <span>You saved</span>
                  <span className="text-emerald-600">{fmt(totals.original - totals.subtotal)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Promo discount</span>
                  <span>-{fmt(discount)}</span>
                </div>
              )}
              {walletUsed > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wallet credit</span>
                  <span>-{fmt(walletUsed)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Payable</span>
                <span>{fmt(payable)}</span>
              </div>

              <div className="pt-2">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Payment secured via <strong>{gatewayLabel}</strong>. Server-side verified.
                  </span>
                </div>
              </div>

              <Button className="w-full mt-2" onClick={payNow} disabled={paying}>
                {paying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingBag className="h-4 w-4 mr-2" />}
                {paying ? 'Starting checkout…' : `Pay ${fmt(payable)} now`}
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  Continue shopping <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>

              {payable <= 0 && items.length > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mt-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    The payable amount is fully covered by wallet and discounts. The mock gateway requires a positive amount.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile sticky pay bar — total + Pay button always reachable */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur px-4 pt-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3">
          <div className="leading-tight shrink-0">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Payable</div>
            <div className="text-lg font-bold">{fmt(payable)}</div>
          </div>
          <Button className="flex-1" onClick={payNow} disabled={paying}>
            {paying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingBag className="h-4 w-4 mr-2" />}
            {paying ? 'Starting checkout…' : 'Pay now'}
          </Button>
        </div>
      </div>

      {/* Checkout modals */}
      {checkoutState?.mode === 'MOCK' && (
        <MockCheckout
          open={true}
          onClose={() => { setCheckoutState(null); setPaying(false) }}
          orderId={checkoutState.orderId}
          amount={checkoutState.amount}
          currencySymbol={currencySymbol}
          customerName={billing.billingName}
          customerEmail={billing.billingEmail}
        />
      )}
      {checkoutState?.mode === 'RAZORPAY' && (
        <RazorpayCheckout
          open={true}
          onClose={() => { setCheckoutState(null); setPaying(false) }}
          checkout={checkoutState.checkout}
          internalOrderId={checkoutState.orderId}
          amount={checkoutState.amount}
          currencySymbol={currencySymbol}
        />
      )}
      {checkoutState?.mode === 'CASHFREE' && (
        <CashfreeCheckout
          open={true}
          onClose={() => { setCheckoutState(null); setPaying(false) }}
          checkout={checkoutState.checkout}
          internalOrderId={checkoutState.orderId}
          amount={checkoutState.amount}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  )
}
