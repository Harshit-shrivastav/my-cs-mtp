// MY CS MTP — Student: mark all own unread notifications as read. STUDENT-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx

  const res = await db.notificationRecipient.updateMany({
    where: { userId: ctx.user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })

  return NextResponse.json({ ok: true, updatedCount: res.count })
}
