// MY CS MTP — Admin examiner detail (GET), edit (PATCH) and delete (DELETE).
// ADMIN-only. Delete nulls the examiner's Assignment.examinerId first in a
// transaction; ExaminerPaper/ExaminerSubject rows cascade via schema.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short.').max(120, 'Name is too long.').optional(),
  mobile: z
    .string()
    .trim()
    .max(15, 'Enter a valid mobile number.')
    .regex(/^[0-9+\-\s]*$/, 'Enter a valid mobile number.')
    .optional()
    .nullable(),
  courseId: z.string().trim().optional().nullable(),
})

export async function GET(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const examiner = await db.user.findFirst({
    where: { id, role: 'EXAMINER' },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      isBlocked: true,
      createdAt: true,
      courseId: true,
      course: { select: { id: true, name: true } },
      examinerPapers: {
        select: {
          id: true,
          paper: {
            select: {
              id: true,
              title: true,
              course: { select: { name: true } },
              plan: { select: { name: true } },
              subject: { select: { name: true } },
            },
          },
        },
      },
      examinerSubjects: {
        select: {
          id: true,
          subject: {
            select: {
              id: true,
              name: true,
              course: { select: { name: true } },
            },
          },
        },
      },
    },
  })
  if (!examiner) return NextResponse.json({ error: 'Examiner not found.' }, { status: 404 })

  const [evaluatedCount, pendingCount, evaluated] = await Promise.all([
    db.assignment.count({ where: { examinerId: id, status: 'EVALUATED' } }),
    db.assignment.count({
      where: { examinerId: id, status: { in: ['ASSIGNED', 'UNDER_EVALUATION'] } },
    }),
    db.assignment.findMany({
      where: { examinerId: id, status: 'EVALUATED' },
      orderBy: { evaluatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        marks: true,
        maxMarks: true,
        submittedAt: true,
        evaluatedAt: true,
        paper: { select: { id: true, title: true, totalMarks: true } },
        student: { select: { id: true, name: true, email: true } },
      },
    }),
  ])

  return NextResponse.json({
    examiner,
    counts: { evaluated: evaluatedCount, pending: pendingCount },
    evaluatedAssignments: evaluated,
  })
}

export async function PATCH(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input.' },
      { status: 400 }
    )
  }
  const data = parsed.data

  const examiner = await db.user.findFirst({ where: { id, role: 'EXAMINER' }, select: { id: true } })
  if (!examiner) return NextResponse.json({ error: 'Examiner not found.' }, { status: 404 })

  if (data.courseId) {
    const course = await db.course.findUnique({ where: { id: data.courseId }, select: { id: true } })
    if (!course) return NextResponse.json({ error: 'Selected course was not found.' }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.mobile !== undefined ? { mobile: data.mobile || null } : {}),
      ...(data.courseId !== undefined ? { courseId: data.courseId || null } : {}),
    },
    select: { id: true, name: true, mobile: true, courseId: true },
  })

  return NextResponse.json({ ok: true, examiner: updated })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const examiner = await db.user.findFirst({ where: { id, role: 'EXAMINER' }, select: { id: true } })
  if (!examiner) return NextResponse.json({ error: 'Examiner not found.' }, { status: 404 })

  // Release their assignments, then delete the account (cascades
  // ExaminerPaper/ExaminerSubject rows via schema onDelete: Cascade).
  await db.$transaction([
    db.assignment.updateMany({ where: { examinerId: id }, data: { examinerId: null } }),
    db.user.delete({ where: { id } }),
  ])

  return NextResponse.json({ ok: true })
}
