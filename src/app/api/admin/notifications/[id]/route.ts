// MY CS MTP — Admin: delete a sent notification (recipients cascade). ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const existing = await db.notification.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Notification not found.' }, { status: 404 })

  // NotificationRecipient rows cascade via schema onDelete: Cascade.
  await db.notification.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
