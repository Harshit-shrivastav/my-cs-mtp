// MY CS MTP — Student: list own in-app notifications (+ unread count). STUDENT-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const takeRaw = parseInt(u.searchParams.get('take') || '50', 10)
  const take = Number.isFinite(takeRaw) && takeRaw > 0 ? Math.min(takeRaw, 100) : 50

  const [rows, unreadCount] = await Promise.all([
    db.notificationRecipient.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        isRead: true,
        readAt: true,
        createdAt: true,
        notification: {
          select: {
            id: true,
            title: true,
            message: true,
            createdAt: true,
          },
        },
      },
    }),
    db.notificationRecipient.count({ where: { userId: ctx.user.id, isRead: false } }),
  ])

  return NextResponse.json({
    unreadCount,
    rows: rows.map((r) => ({
      id: r.id,
      title: r.notification.title,
      message: r.notification.message,
      isRead: r.isRead,
      readAt: r.readAt,
      createdAt: r.createdAt,
      notificationAt: r.notification.createdAt,
    })),
  })
}
