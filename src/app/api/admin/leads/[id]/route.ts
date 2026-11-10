// MY CS MTP — Admin lead detail (DELETE). ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const lead = await db.lead.findUnique({ where: { id }, select: { id: true } })
  if (!lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })

  await db.lead.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
