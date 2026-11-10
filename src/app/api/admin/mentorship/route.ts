// MY CS MTP — Admin mentorship list GET. ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['REQUESTED', 'ASSIGNED', 'COMPLETED', 'CANCELLED'] as const

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim()
  const status = u.searchParams.get('status') || undefined
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSize = parseInt(u.searchParams.get('pageSize') || '10', 10) || 10

  const where: any = {
    ...(q ? {
      OR: [
        { topic: { contains: q } },
        { student: { name: { contains: q } } },
        { student: { email: { contains: q } } },
      ],
    } : {}),
    ...(status ? { status } : {}),
  }

  const [total, rows] = await Promise.all([
    db.mentorship.count({ where }),
    db.mentorship.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        topic: true,
        notes: true,
        status: true,
        mentorName: true,
        requestedAt: true,
        updatedAt: true,
        student: { select: { id: true, name: true, email: true } },
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

export { VALID_STATUSES }
