// MY CS MTP — Admin newsletter subscribers list API. ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim()
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSize = parseInt(u.searchParams.get('pageSize') || '10', 10) || 10
  const status = u.searchParams.get('status') // 'active' | 'inactive' | null

  const where = {
    ...(q ? { email: { contains: q } } : {}),
    ...(status === 'active' ? { isActive: true } : status === 'inactive' ? { isActive: false } : {}),
  }

  const [total, activeCount, rows] = await Promise.all([
    db.newsletterSubscriber.count({ where }),
    db.newsletterSubscriber.count({ where: { isActive: true } }),
    db.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        isActive: true,
        source: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    }),
  ])

  return NextResponse.json({
    total,
    activeCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    rows,
  })
}
