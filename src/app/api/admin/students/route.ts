// MY CS MTP — Admin: list students. ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim()
  const courseId = u.searchParams.get('courseId') || undefined
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSize = parseInt(u.searchParams.get('pageSize') || '10', 10) || 10

  const where = {
    role: 'STUDENT' as const,
    ...(q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : {}),
    ...(courseId ? { courseId } : {}),
  }

  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        isBlocked: true,
        createdAt: true,
        course: { select: { id: true, name: true } },
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
