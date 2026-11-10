// MY CS MTP — Admin notes CRUD API. ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const schema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional().nullable(),
  courseId: z.string().min(1, 'Course is required.'),
  planId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  fileKey: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
})

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim()
  const courseId = u.searchParams.get('courseId') || undefined
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSize = parseInt(u.searchParams.get('pageSize') || '10', 10) || 10

  const where: any = {
    ...(q ? { title: { contains: q } } : {}),
    ...(courseId ? { courseId } : {}),
  }

  const [total, rows] = await Promise.all([
    db.note.count({ where }),
    db.note.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        description: true,
        courseId: true,
        planId: true,
        subjectId: true,
        fileKey: true,
        isActive: true,
        createdAt: true,
        course: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
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

export async function POST(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }
  const data = parsed.data

  const course = await db.course.findUnique({ where: { id: data.courseId }, select: { id: true } })
  if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 400 })

  if (data.planId) {
    const plan = await db.plan.findUnique({ where: { id: data.planId }, select: { id: true, courseId: true } })
    if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 400 })
    if (plan.courseId !== data.courseId) return NextResponse.json({ error: 'Plan does not belong to the selected course.' }, { status: 400 })
  }
  if (data.subjectId) {
    const subject = await db.subject.findUnique({ where: { id: data.subjectId }, select: { id: true, courseId: true } })
    if (!subject) return NextResponse.json({ error: 'Subject not found.' }, { status: 400 })
    if (subject.courseId !== data.courseId) return NextResponse.json({ error: 'Subject does not belong to the selected course.' }, { status: 400 })
  }

  const note = await db.note.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      courseId: data.courseId,
      planId: data.planId || null,
      subjectId: data.subjectId || null,
      fileKey: data.fileKey ?? null,
      isActive: data.isActive,
    },
    select: { id: true },
  })
  return NextResponse.json({ ok: true, note })
}
