// MY CS MTP — Admin: update + delete a plan-subject link. ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const schema = z.object({
  originalPrice: z.number().min(0).optional(),
  offerPrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
})

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
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }
  const data = parsed.data

  const ps = await db.planSubject.findUnique({ where: { id }, select: { id: true } })
  if (!ps) return NextResponse.json({ error: 'Plan subject not found.' }, { status: 404 })

  const updated = await db.planSubject.update({
    where: { id },
    data: {
      ...(data.originalPrice !== undefined ? { originalPrice: data.originalPrice } : {}),
      ...(data.offerPrice !== undefined ? { offerPrice: data.offerPrice } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    select: { id: true },
  })
  return NextResponse.json({ ok: true, planSubject: updated })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const ps = await db.planSubject.findUnique({ where: { id }, select: { id: true } })
  if (!ps) return NextResponse.json({ error: 'Plan subject not found.' }, { status: 404 })

  await db.planSubject.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
