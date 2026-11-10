// MY CS MTP — Admin schedule name DELETE. ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const sn = await db.scheduleName.findUnique({ where: { id }, select: { id: true } })
  if (!sn) return NextResponse.json({ error: 'Schedule name not found.' }, { status: 404 })

  // Detach from any schedules currently using it
  await db.schedule.updateMany({
    where: { scheduleNameId: id },
    data: { scheduleNameId: null },
  })
  await db.scheduleName.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
