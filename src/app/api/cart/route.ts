import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { fetchCart } from '@/lib/cart'

// GET — list current user's cart
export async function GET(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx
  const { items, totals } = await fetchCart(ctx.user.id)
  return NextResponse.json({ items, totals })
}

const postSchema = z.object({
  planId: z.string().min(1),
  planSubjectIds: z.array(z.string().min(1)).optional(),
  planSubjectId: z.string().min(1).optional(),
}).refine(
  (v) => (v.planSubjectIds && v.planSubjectIds.length > 0) || v.planSubjectId,
  { message: 'Provide planSubjectId or planSubjectIds.' }
)

// POST — add to cart (idempotent)
export async function POST(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }
  const { planId, planSubjectIds, planSubjectId } = parsed.data
  const ids = planSubjectIds && planSubjectIds.length > 0 ? planSubjectIds : planSubjectId ? [planSubjectId] : []

  // Validate each planSubject belongs to this plan and is active
  const planRows = await db.planSubject.findMany({
    where: { id: { in: ids }, planId },
  })
  if (planRows.length !== ids.length) {
    return NextResponse.json({ error: 'Some subjects do not belong to the selected plan.' }, { status: 400 })
  }
  for (const ps of planRows) {
    if (!ps.isActive) {
      return NextResponse.json({ error: 'One of the selected subjects is no longer available.' }, { status: 400 })
    }
  }

  // Idempotent — skip if cart already has this user+planSubject
  const existing = await db.cartItem.findMany({
    where: { userId: ctx.user.id, planSubjectId: { in: ids } },
    select: { planSubjectId: true },
  })
  const existingSet = new Set(existing.map((e) => e.planSubjectId))
  const newIds = ids.filter((id) => !existingSet.has(id))

  if (newIds.length > 0) {
    // Re-fetch current prices (NEVER trust client)
    const freshRows = await db.planSubject.findMany({
      where: { id: { in: newIds }, isActive: true },
      select: { id: true, offerPrice: true, originalPrice: true, subjectId: true },
    })
    if (freshRows.length !== newIds.length) {
      return NextResponse.json({ error: 'One of the selected subjects is no longer available.' }, { status: 400 })
    }
    await db.cartItem.createMany({
      data: freshRows.map((ps) => ({
        userId: ctx.user.id,
        planId,
        planSubjectId: ps.id,
        subjectId: ps.subjectId,
        priceSnapshot: ps.offerPrice,
        originalPriceSnapshot: ps.originalPrice,
      })),
    })
  }

  const count = await db.cartItem.count({ where: { userId: ctx.user.id } })
  const added = newIds.length
  const msg = added === 0
    ? 'Already in your cart.'
    : `Added ${added} item${added > 1 ? 's' : ''} to cart.`

  return NextResponse.json({ ok: true, count, added, message: msg })
}

const deleteSchema = z.object({
  cartItemId: z.string().min(1).optional(),
  planSubjectId: z.string().min(1).optional(),
}).refine((v) => v.cartItemId || v.planSubjectId, { message: 'Provide cartItemId or planSubjectId.' })

// DELETE — remove an item from cart
export async function DELETE(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }
  const { cartItemId, planSubjectId } = parsed.data

  await db.cartItem.deleteMany({
    where: {
      userId: ctx.user.id,
      ...(cartItemId ? { id: cartItemId } : { planSubjectId }),
    },
  })

  const count = await db.cartItem.count({ where: { userId: ctx.user.id } })
  return NextResponse.json({ ok: true, count })
}
