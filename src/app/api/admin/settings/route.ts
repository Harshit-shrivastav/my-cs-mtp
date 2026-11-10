// MY CS MTP — Admin site settings PATCH API. ADMIN-only.
// Accepts { key: value } entries of KNOWN SiteSettings keys only (unknown keys
// are rejected). Booleans are stored as 'true'/'false'; setSetting nulls the
// in-memory cache so changes go live immediately.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { setSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'

// Known, editable settings keys with per-key value validation (camelCase names
// mirror SiteSettings in src/lib/settings.ts).
const KEY_SCHEMAS: Record<string, z.ZodTypeAny> = {
  // Identity
  siteName: z.string().trim().min(1, 'Site name cannot be empty.').max(120),
  tagline: z.string().trim().max(300),
  logoKey: z.string().max(600).nullable(),
  faviconKey: z.string().max(600).nullable(),
  ogImageKey: z.string().max(600).nullable(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Theme color must be a hex value.'),
  // Contact
  supportEmail: z.string().trim().max(200),
  supportPhone: z.string().trim().max(40),
  whatsappNumber: z.string().trim().max(20),
  whatsappLink: z.string().trim().max(300),
  address: z.string().trim().max(500),
  // Social
  facebook: z.string().trim().max(300),
  instagram: z.string().trim().max(300),
  twitter: z.string().trim().max(300),
  youtube: z.string().trim().max(300),
  // Catalogue & display
  currencySymbol: z.string().trim().min(1, 'Currency symbol cannot be empty.').max(8),
  subjectsBeforeViewMore: z.number().int().min(0).max(100),
  // Assignment & evaluation
  assignmentUploadEnabled: z.boolean(),
  assignmentUploadDisabledMessage: z.string().max(500),
  evaluationPromiseText: z.string().max(1000),
  // Free content
  freeContentEnabled: z.boolean(),
  // Two-Factor Auth
  twoFactorEnabled: z.boolean(),
  // Analytics
  googleAnalyticsId: z.string().trim().max(50),
  // Other known keys (edited on their own admin pages — accepted for completeness)
  promoWalletAmount: z.number().int().min(0).max(1000000),
  promoWalletRules: z.string().max(2000),
  referralRewardType: z.enum(['WALLET', 'PERCENT']),
  referralRewardValue: z.number().min(0).max(100000),
  referralRules: z.string().max(2000),
  salePopupEnabled: z.boolean(),
  salePopupTitle: z.string().max(200),
  salePopupText: z.string().max(1000),
  salePopupImageKey: z.string().max(600).nullable(),
  salePopupDelaySeconds: z.number().int().min(0).max(600),
  salePopupFrequency: z.enum(['ONCE_PER_SESSION', 'ONCE_PER_DAY', 'ALWAYS']),
  activePaymentGateway: z.enum(['RAZORPAY', 'CASHFREE', 'MOCK']),
  paymentMode: z.enum(['SANDBOX', 'PRODUCTION']),
  razorpayEnabled: z.boolean(),
  cashfreeEnabled: z.boolean(),
}

function toStoredString(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (value === null || value === undefined) return ''
  return String(value)
}

export async function PATCH(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected a { key: value } object.' }, { status: 400 })
  }

  const entries = Object.entries(body as Record<string, unknown>)
  if (entries.length === 0) {
    return NextResponse.json({ error: 'No settings provided.' }, { status: 400 })
  }

  // Validate every key against the known list; reject unknown keys.
  for (const [key, value] of entries) {
    const keySchema = KEY_SCHEMAS[key]
    if (!keySchema) {
      return NextResponse.json(
        { error: `Unknown setting key: "${key}". Only known SiteSettings keys are accepted.` },
        { status: 400 }
      )
    }
    const result = keySchema.safeParse(value)
    if (!result.success) {
      return NextResponse.json(
        { error: `Invalid value for "${key}": ${result.error.issues[0]?.message || 'validation failed'}` },
        { status: 400 }
      )
    }
  }

  // Persist (setSetting upserts + nulls the settings cache).
  for (const [key, value] of entries) {
    await setSetting(key as Parameters<typeof setSetting>[0], toStoredString(value))
  }

  return NextResponse.json({ ok: true, updated: entries.length })
}
