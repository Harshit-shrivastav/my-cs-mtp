// MY CS MTP — Admin payment gateway config API. ADMIN-only.
// Reads/writes SiteConfig keys (settings source of truth) AND keeps the
// single PaymentGatewayConfig table row in sync (it drives activeGateway()
// in src/lib/payments.ts). Secrets stay in env — never returned.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { setSetting } from '@/lib/settings'
import { loadPaymentGatewayState, razorpayConfigured, cashfreeConfigured } from '@/lib/payment-gateway-status'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  return NextResponse.json(await loadPaymentGatewayState())
}

const schema = z.object({
  activePaymentGateway: z.enum(['RAZORPAY', 'CASHFREE', 'MOCK']),
  paymentMode: z.enum(['SANDBOX', 'PRODUCTION']),
  razorpayEnabled: z.boolean(),
  cashfreeEnabled: z.boolean(),
})

export async function PATCH(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input.' },
      { status: 400 }
    )
  }
  const data = parsed.data

  // The active gateway must be one of the enabled ones (MOCK always allowed).
  const enabledMap: Record<string, boolean> = {
    RAZORPAY: data.razorpayEnabled,
    CASHFREE: data.cashfreeEnabled,
    MOCK: true,
  }
  if (!enabledMap[data.activePaymentGateway]) {
    return NextResponse.json(
      {
        error: `Active gateway must be one of the enabled gateways (or MOCK). "${data.activePaymentGateway}" is not enabled — enable it first or pick another active gateway.`,
      },
      { status: 400 }
    )
  }

  // Non-fatal warnings — e.g. enabling a gateway whose env keys are missing.
  const warnings: string[] = []
  if (data.razorpayEnabled && !razorpayConfigured()) {
    warnings.push(
      'Razorpay is enabled but not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env. Checkout will fall back to MOCK until the keys are added.'
    )
  }
  if (data.cashfreeEnabled && !cashfreeConfigured()) {
    warnings.push(
      'Cashfree is enabled but not configured: set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in .env. Checkout will fall back to MOCK until the keys are added.'
    )
  }

  // 1. Persist SiteConfig keys (setSetting nulls the settings cache → live immediately)
  await setSetting('activePaymentGateway', data.activePaymentGateway)
  await setSetting('paymentMode', data.paymentMode)
  await setSetting('razorpayEnabled', data.razorpayEnabled ? 'true' : 'false')
  await setSetting('cashfreeEnabled', data.cashfreeEnabled ? 'true' : 'false')

  // 2. Keep the single PaymentGatewayConfig row in sync (it drives activeGateway())
  const row = await db.paymentGatewayConfig.findFirst()
  const rowValues = {
    activeGateway: data.activePaymentGateway,
    mode: data.paymentMode,
    razorpayEnabled: data.razorpayEnabled,
    cashfreeEnabled: data.cashfreeEnabled,
  }
  if (row) {
    await db.paymentGatewayConfig.update({ where: { id: row.id }, data: rowValues })
  } else {
    await db.paymentGatewayConfig.create({ data: rowValues })
  }

  const state = await loadPaymentGatewayState()
  return NextResponse.json({ ok: true, warnings, ...state })
}
