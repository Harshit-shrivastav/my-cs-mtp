// MY CS MTP — Admin sale popup configuration API. ADMIN-only.
// The live popup reads the salePopup* SiteSettings keys (NOT the PopupConfig
// model), so this API reads/writes settings via getSettings()/setSetting().
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { getSettings, setSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'

const POPUP_KEYS = [
  'salePopupEnabled',
  'salePopupTitle',
  'salePopupText',
  'salePopupImageKey',
  'salePopupDelaySeconds',
  'salePopupFrequency',
] as const

const patchSchema = z.object({
  salePopupEnabled: z.boolean().optional(),
  salePopupTitle: z.string().max(200, 'Title is too long.').optional(),
  salePopupText: z.string().max(1000, 'Text is too long.').optional(),
  salePopupImageKey: z.string().nullable().optional(),
  salePopupDelaySeconds: z
    .number()
    .int('Delay must be a whole number of seconds.')
    .min(0, 'Delay cannot be negative.')
    .max(600, 'Delay cannot exceed 600 seconds.')
    .optional(),
  salePopupFrequency: z
    .enum(['ONCE_PER_SESSION', 'ALWAYS', 'ONCE_PER_DAY'], {
      message: 'Invalid frequency.',
    })
    .optional(),
})

function popupSubset(s: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const k of POPUP_KEYS) out[k] = s[k]
  return out
}

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const settings = await getSettings()
  return NextResponse.json({ ok: true, popup: popupSubset(settings as unknown as Record<string, unknown>) })
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
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }
  const data = parsed.data

  // Persist each provided field as a string setting ('true'/'false' for
  // booleans, numbers as strings) — setSetting invalidates the settings cache.
  if (data.salePopupEnabled !== undefined) {
    await setSetting('salePopupEnabled', data.salePopupEnabled ? 'true' : 'false')
  }
  if (data.salePopupTitle !== undefined) {
    await setSetting('salePopupTitle', data.salePopupTitle)
  }
  if (data.salePopupText !== undefined) {
    await setSetting('salePopupText', data.salePopupText)
  }
  if (data.salePopupImageKey !== undefined) {
    await setSetting('salePopupImageKey', data.salePopupImageKey || '')
  }
  if (data.salePopupDelaySeconds !== undefined) {
    await setSetting('salePopupDelaySeconds', String(data.salePopupDelaySeconds))
  }
  if (data.salePopupFrequency !== undefined) {
    await setSetting('salePopupFrequency', data.salePopupFrequency)
  }

  // Force re-read so the response reflects the saved values immediately.
  const settings = await getSettings({ force: true })
  return NextResponse.json({
    ok: true,
    popup: popupSubset(settings as unknown as Record<string, unknown>),
  })
}
