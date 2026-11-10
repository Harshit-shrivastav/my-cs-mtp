// MY CS MTP — Admin promotional wallet config API. ADMIN-only.
// Settings keys: promoWalletAmount (stored as string, coerced to int by
// getSettings) and promoWalletRules. See src/app/api/auth/signup/route.ts for
// where the credit is applied on signup.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { getSettings, setSetting } from '@/lib/settings'
import { readPromoWalletStatus } from '@/lib/promo-wallet-status'

export const dynamic = 'force-dynamic'

async function loadState() {
  const [settings, wiring] = await Promise.all([getSettings(), readPromoWalletStatus()])
  return {
    promoWalletAmount: settings.promoWalletAmount,
    promoWalletRules: settings.promoWalletRules,
    wiredOnSignup: wiring.wiredOnSignup,
  }
}

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  return NextResponse.json(await loadState())
}

const schema = z.object({
  promoWalletAmount: z
    .number()
    .int('Amount must be a whole number.')
    .min(0, 'Amount cannot be negative.')
    .max(1000000, 'Amount is too large.'),
  promoWalletRules: z.string().max(2000, 'Rules text is too long.'),
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

  // setSetting stores strings; getSettings coerces promoWalletAmount back to int.
  await setSetting('promoWalletAmount', String(data.promoWalletAmount))
  await setSetting('promoWalletRules', data.promoWalletRules)

  return NextResponse.json({ ok: true, ...(await loadState()) })
}
