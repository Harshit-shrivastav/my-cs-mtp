// MY CS MTP — Admin: update (activate/deactivate) or delete a newsletter subscriber. ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  isActive: z.boolean({ message: 'isActive must be a boolean.' }),
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
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input.' },
      { status: 400 }
    )
  }

  const existing = await db.newsletterSubscriber.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Subscriber not found.' }, { status: 404 })

  const updated = await db.newsletterSubscriber.update({
    where: { id },
    data: { isActive: parsed.data.isActive },
    select: { id: true, email: true, isActive: true },
  })

  return NextResponse.json({ ok: true, subscriber: updated })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const existing = await db.newsletterSubscriber.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Subscriber not found.' }, { status: 404 })

  await db.newsletterSubscriber.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
