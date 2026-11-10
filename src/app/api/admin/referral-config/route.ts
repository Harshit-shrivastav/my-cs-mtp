// MY CS MTP — Admin referral config API. ADMIN-only.
// Source of truth = SiteConfig keys via getSettings()/setSetting
// (referralRewardType / referralRewardValue / referralRules). The single
// ReferralConfig table row is kept in sync (holds isActive, which has no
// SiteConfig key) so it never goes stale.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { getSettings, setSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'

async function loadState() {
  const [settings, row] = await Promise.all([
    getSettings(),
    db.referralConfig.findFirst(),
  ])
  return {
    rewardType: settings.referralRewardType,
    rewardValue: settings.referralRewardValue,
    rules: settings.referralRules,
    isActive: row?.isActive ?? true,
    hasTableRow: !!row,
    rowInSync: row
      ? row.rewardType === settings.referralRewardType &&
        row.rewardValue === settings.referralRewardValue &&
        (row.rules ?? '') === settings.referralRules
      : false,
  }
}

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  return NextResponse.json(await loadState())
}

const schema = z.object({
  rewardType: z.enum(['WALLET', 'PERCENT']),
  rewardValue: z.number().min(0, 'Reward value cannot be negative.').max(100000, 'Reward value is too large.'),
  rules: z.string().max(2000, 'Rules text is too long.'),
  isActive: z.boolean(),
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

  // 1. SiteConfig keys (setSetting nulls the settings cache → live immediately)
  await setSetting('referralRewardType', data.rewardType)
  await setSetting('referralRewardValue', String(Math.round(data.rewardValue)))
  await setSetting('referralRules', data.rules)

  // 2. Mirror to the single ReferralConfig row so the table isn't stale
  const row = await db.referralConfig.findFirst()
  const rowValues = {
    rewardType: data.rewardType,
    rewardValue: data.rewardValue,
    rules: data.rules,
    isActive: data.isActive,
  }
  if (row) {
    await db.referralConfig.update({ where: { id: row.id }, data: rowValues })
  } else {
    await db.referralConfig.create({ data: rowValues })
  }

  return NextResponse.json({ ok: true, ...(await loadState()) })
}
