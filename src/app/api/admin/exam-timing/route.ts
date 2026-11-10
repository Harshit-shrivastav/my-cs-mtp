// MY CS MTP — Admin exam timing CRUD API. ADMIN-only.
// ExamTiming rows power the public homepage countdown and each student's
// dashboard countdown (read via the Course↔ExamTiming relation, max 1 per course).
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { daysRemaining, handleExamTimingPrismaError, examTimingSchema } from '@/lib/exam-timing-utils'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const rows = await db.examTiming.findMany({
    orderBy: { examDate: 'asc' },
    include: { course: { select: { id: true, name: true } } },
  })

  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id,
      examName: r.examName,
      courseKey: r.courseKey,
      courseId: r.courseId,
      courseName: r.course?.name ?? null,
      examDate: r.examDate.toISOString(),
      isVisible: r.isVisible,
      daysRemaining: daysRemaining(r.examDate),
    })),
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
  const parsed = examTimingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input.' },
      { status: 400 }
    )
  }
  const data = parsed.data
  const courseId = data.courseId ? data.courseId : null

  if (courseId) {
    const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true } })
    if (!course) return NextResponse.json({ error: 'Selected course was not found.' }, { status: 400 })
    // courseId is unique on ExamTiming — one countdown per course.
    const taken = await db.examTiming.findUnique({ where: { courseId }, select: { id: true } })
    if (taken) {
      return NextResponse.json(
        { error: 'That course already has an exam countdown. Edit the existing row instead (one countdown per course).' },
        { status: 400 }
      )
    }
  }

  try {
    const row = await db.examTiming.create({
      data: {
        examName: data.examName,
        courseKey: data.courseKey,
        courseId,
        examDate: new Date(data.examDate),
        isVisible: data.isVisible,
      },
      select: { id: true },
    })
    return NextResponse.json({ ok: true, id: row.id })
  } catch (e) {
    return NextResponse.json(
      { error: handleExamTimingPrismaError(e, 'Could not create exam timing.') },
      { status: e && typeof e === 'object' && (e as { code?: string }).code === 'P2002' ? 400 : 500 }
    )
  }
}
