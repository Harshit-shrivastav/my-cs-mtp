// MY CS MTP — Admin exam timing update/delete API. ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { examTimingSchema, handleExamTimingPrismaError } from '@/lib/exam-timing-utils'

export const dynamic = 'force-dynamic'

interface RouteCtx {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, { params }: RouteCtx) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const existing = await db.examTiming.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Exam timing not found.' }, { status: 404 })
  }

  // Partial update — merge with existing values, then validate the whole shape.
  const merged = {
    examName: (body as Record<string, unknown>).examName ?? existing.examName,
    courseKey: (body as Record<string, unknown>).courseKey ?? existing.courseKey,
    courseId:
      (body as Record<string, unknown>).courseId === undefined
        ? existing.courseId
        : (body as Record<string, unknown>).courseId,
    examDate:
      (body as Record<string, unknown>).examDate === undefined
        ? existing.examDate.toISOString()
        : (body as Record<string, unknown>).examDate,
    isVisible:
      typeof (body as Record<string, unknown>).isVisible === 'boolean'
        ? (body as Record<string, unknown>).isVisible
        : existing.isVisible,
  }

  const parsed = examTimingSchema.safeParse(merged)
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
    const taken = await db.examTiming.findUnique({ where: { courseId }, select: { id: true } })
    if (taken && taken.id !== id) {
      return NextResponse.json(
        { error: 'That course already has an exam countdown. Only one countdown per course is allowed.' },
        { status: 400 }
      )
    }
  }

  try {
    await db.examTiming.update({
      where: { id },
      data: {
        examName: data.examName,
        courseKey: data.courseKey,
        courseId,
        examDate: new Date(data.examDate),
        isVisible: data.isVisible,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: handleExamTimingPrismaError(e, 'Could not update exam timing.') },
      { status: e && typeof e === 'object' && (e as { code?: string }).code === 'P2002' ? 400 : 500 }
    )
  }
}

export async function DELETE(req: Request, { params }: RouteCtx) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await params

  const existing = await db.examTiming.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ error: 'Exam timing not found.' }, { status: 404 })
  }
  await db.examTiming.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
