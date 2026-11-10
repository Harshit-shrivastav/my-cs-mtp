// MY CS MTP — Admin AI config API. ADMIN-only.
// Single AiConfig row (upsert). The apiKey is WRITE-ONLY: GET never returns it —
// only hasApiKey + a masked hint. Blank apiKey on save keeps the stored key.
// NOTE: the blog AI-generate endpoint (built separately) READS this config —
// do not rename/remove AiConfig fields.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

function maskKey(key: string | null | undefined): string | null {
  if (!key) return null
  const trimmed = key.trim()
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 3)}…${trimmed.slice(-4)}`
}

async function loadState() {
  const row = await db.aiConfig.findFirst()
  return {
    provider: row?.provider ?? '',
    baseUrl: row?.baseUrl ?? '',
    model: row?.model ?? '',
    isActive: row?.isActive ?? false,
    hasApiKey: Boolean(row?.apiKey),
    apiKeyHint: maskKey(row?.apiKey),
    updatedAt: row?.updatedAt?.toISOString() ?? null,
    hasRow: !!row,
  }
}

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  return NextResponse.json(await loadState())
}

const schema = z.object({
  provider: z.string().trim().min(1, 'Provider is required.').max(100).optional(),
  baseUrl: z.string().trim().max(500).nullable().optional(),
  model: z.string().trim().max(200).nullable().optional(),
  // Write-only. Empty string / undefined = keep existing stored key.
  apiKey: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
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

  const row = await db.aiConfig.findFirst()
  const values = {
    provider: data.provider !== undefined ? data.provider : (row?.provider ?? 'openai-compatible'),
    baseUrl: data.baseUrl !== undefined ? data.baseUrl : (row?.baseUrl ?? null),
    model: data.model !== undefined ? data.model : (row?.model ?? null),
    // Blank/omitted apiKey keeps the stored key (never cleared via blank save).
    apiKey:
      data.apiKey !== undefined && data.apiKey.trim() !== ''
        ? data.apiKey.trim()
        : (row?.apiKey ?? null),
    isActive: data.isActive !== undefined ? data.isActive : (row?.isActive ?? false),
  }

  if (row) {
    await db.aiConfig.update({ where: { id: row.id }, data: values })
  } else {
    await db.aiConfig.create({ data: values })
  }

  return NextResponse.json({ ok: true, ...(await loadState()) })
}
