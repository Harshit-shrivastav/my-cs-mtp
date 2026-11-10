// MY CS MTP — Admin paper detail (PATCH + DELETE). ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { slugify } from '@/lib/utils-extra'

export const dynamic = 'force-dynamic'

const schema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  courseId: z.string().min(1).optional(),
  planId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  questionFileKey: z.string().nullable().optional(),
  answerFileKey: z.string().nullable().optional(),
  allowAnswerDownload: z.boolean().optional(),
  scheduledDate: z.string().nullable().optional(),
  totalMarks: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

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
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }
  const data = parsed.data

  const paper = await db.testPaper.findUnique({ where: { id }, select: { id: true, slug: true, planSubjectId: true, courseId: true, planId: true, subjectId: true } })
  if (!paper) return NextResponse.json({ error: 'Paper not found.' }, { status: 404 })

  // Determine final course/plan/subject
  const finalCourseId = data.courseId || paper.courseId
  const finalPlanId = data.planId || paper.planId
  const finalSubjectId = data.subjectId || paper.subjectId

  // If course/plan/subject changed, re-validate
  const coursePlanSubjectChanged =
    data.courseId !== undefined || data.planId !== undefined || data.subjectId !== undefined

  let planSubjectId = paper.planSubjectId
  if (coursePlanSubjectChanged) {
    const [plan, subject, planSubject] = await Promise.all([
      db.plan.findUnique({ where: { id: finalPlanId }, select: { id: true, courseId: true } }),
      db.subject.findUnique({ where: { id: finalSubjectId }, select: { id: true, courseId: true } }),
      db.planSubject.findUnique({
        where: { planId_subjectId: { planId: finalPlanId, subjectId: finalSubjectId } },
        select: { id: true },
      }),
    ])
    if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 400 })
    if (!subject) return NextResponse.json({ error: 'Subject not found.' }, { status: 400 })
    if (plan.courseId !== finalCourseId) return NextResponse.json({ error: 'Plan does not belong to the selected course.' }, { status: 400 })
    if (subject.courseId !== finalCourseId) return NextResponse.json({ error: 'Subject does not belong to the selected course.' }, { status: 400 })
    if (!planSubject) return NextResponse.json({ error: 'Selected subject is not part of the selected plan.' }, { status: 400 })
    planSubjectId = planSubject.id
  }

  let finalSlug = paper.slug
  if (data.slug && data.slug !== paper.slug) {
    let slug = data.slug || slugify(data.title || paper.slug)
    const existing = await db.testPaper.findFirst({ where: { slug, NOT: { id } }, select: { id: true } })
    if (existing) {
      let i = 1
      while (true) {
        const cand = `${slug}-${i}`
        const ex = await db.testPaper.findFirst({ where: { slug: cand, NOT: { id } }, select: { id: true } })
        if (!ex) { slug = cand; break }
        i++
      }
    }
    finalSlug = slug
  }

  const updated = await db.testPaper.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      slug: finalSlug,
      courseId: finalCourseId,
      planId: finalPlanId,
      subjectId: finalSubjectId,
      planSubjectId,
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.questionFileKey !== undefined ? { questionFileKey: data.questionFileKey } : {}),
      ...(data.answerFileKey !== undefined ? { answerFileKey: data.answerFileKey } : {}),
      ...(data.allowAnswerDownload !== undefined ? { allowAnswerDownload: data.allowAnswerDownload } : {}),
      ...(data.scheduledDate !== undefined ? { scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null } : {}),
      ...(data.totalMarks !== undefined ? { totalMarks: data.totalMarks } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
    select: { id: true, slug: true },
  })
  return NextResponse.json({ ok: true, paper: updated })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const paper = await db.testPaper.findUnique({ where: { id }, select: { id: true } })
  if (!paper) return NextResponse.json({ error: 'Paper not found.' }, { status: 404 })

  await db.testPaper.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
