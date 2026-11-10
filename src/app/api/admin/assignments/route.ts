// MY CS MTP — Admin assignments list GET. ADMIN-only.
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
  const subjectId = u.searchParams.get('subjectId') || undefined
  const status = u.searchParams.get('status') || undefined
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSize = parseInt(u.searchParams.get('pageSize') || '10', 10) || 10

  const where: any = {
    ...(courseId ? { paper: { courseId } } : {}),
    ...(subjectId ? { paper: { subjectId } } : {}),
    ...(status ? { status } : {}),
    ...(q ? {
      OR: [
        { student: { name: { contains: q } } },
        { student: { email: { contains: q } } },
        { paper: { title: { contains: q } } },
      ],
    } : {}),
  }

  const [total, rows] = await Promise.all([
    db.assignment.count({ where }),
    db.assignment.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        marks: true,
        maxMarks: true,
        submittedAt: true,
        evaluatedAt: true,
        student: { select: { id: true, name: true, email: true } },
        paper: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
            courseId: true,
            subjectId: true,
            subject: { select: { id: true, name: true } },
            course: { select: { id: true, name: true } },
          },
        },
        examiner: { select: { id: true, name: true, email: true } },
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
