// MY CS MTP — Admin promo codes list + create API. ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { promoSchema, validatePromoRules, promoData } from '@/lib/admin-promo'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim()
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSizeRaw = parseInt(u.searchParams.get('pageSize') || '10', 10)
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 && pageSizeRaw <= 100 ? pageSizeRaw : 10

  const where = q ? { code: { contains: q.toUpperCase() } } : {}

  const [total, rows] = await Promise.all([
    db.promoCode.count({ where }),
    db.promoCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        code: true,
        type: true,
        value: true,
        minAmount: true,
        maxDiscount: true,
        usageLimit: true,
        usedCount: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ])

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    rows,
  })
}

export async function POST(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = promoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }
  const ruleError = validatePromoRules(parsed.data)
  if (ruleError) return NextResponse.json({ error: ruleError }, { status: 400 })

  const data = promoData(parsed.data)

  const existing = await db.promoCode.findUnique({ where: { code: data.code }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: `Promo code "${data.code}" already exists.` }, { status: 400 })
  }

  const promo = await db.promoCode.create({ data, select: { id: true, code: true } })
  return NextResponse.json({ ok: true, promo })
}
