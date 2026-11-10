// MY CS MTP — Admin: single promo code GET / PATCH / DELETE. ADMIN-only.
// DELETE unlinks referencing orders (promoCodeId → null) in a transaction before deleting.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { promoSchema, validatePromoRules, promoData } from '@/lib/admin-promo'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const promo = await db.promoCode.findUnique({
    where: { id },
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
  })
  if (!promo) return NextResponse.json({ error: 'Promo code not found.' }, { status: 404 })

  return NextResponse.json({ promo })
}

export async function PATCH(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

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

  const promo = await db.promoCode.findUnique({ where: { id }, select: { id: true } })
  if (!promo) return NextResponse.json({ error: 'Promo code not found.' }, { status: 404 })

  const data = promoData(parsed.data)

  // Enforce unique code (excluding this row).
  const clash = await db.promoCode.findUnique({ where: { code: data.code }, select: { id: true } })
  if (clash && clash.id !== id) {
    return NextResponse.json({ error: `Promo code "${data.code}" already exists.` }, { status: 400 })
  }

  const updated = await db.promoCode.update({
    where: { id },
    data,
    select: { id: true, code: true },
  })
  return NextResponse.json({ ok: true, promo: updated })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const promo = await db.promoCode.findUnique({
    where: { id },
    select: { id: true, code: true, _count: { select: { orders: true } } },
  })
  if (!promo) return NextResponse.json({ error: 'Promo code not found.' }, { status: 404 })

  // The Order.promoCodeId relation has no onDelete rule in the schema, so unlink
  // referencing orders first (keeps their historic discount amounts intact).
  const unlinked = await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { promoCodeId: id },
      data: { promoCodeId: null },
    })
    await tx.promoCode.delete({ where: { id } })
    return res.count
  })

  return NextResponse.json({ ok: true, unlinkedOrders: unlinked })
}
