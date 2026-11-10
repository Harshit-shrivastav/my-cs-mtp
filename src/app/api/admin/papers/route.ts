// MY CS MTP — Admin papers CRUD API. ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { slugify } from '@/lib/utils-extra'

export const dynamic = 'force-dynamic'

const schema = z.object({
  title: z.string().min(1, 'Title is required.'),
  slug: z.string().min(1, 'Slug is required.'),
  courseId: z.string().min(1, 'Course is required.'),
  planId: z.string().min(1, 'Plan is required.'),
  subjectId: z.string().min(1, 'Subject is required.'),
  description: z.string().optional().nullable(),
  questionFileKey: z.string().nullable().optional(),
  answerFileKey: z.string().nullable().optional(),
  allowAnswerDownload: z.boolean().optional().default(false),
  scheduledDate: z.string().nullable().optional(),
  totalMarks: z.number().min(0).optional().default(100),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
})

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim()
  const courseId = u.searchParams.get('courseId') || undefined
  const planId = u.searchParams.get('planId') || undefined
  const subjectId = u.searchParams.get('subjectId') || undefined
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSize = parseInt(u.searchParams.get('pageSize') || '10', 10) || 10

  const where: any = {
    ...(q ? { OR: [{ title: { contains: q } }, { slug: { contains: q } }] } : {}),
    ...(courseId ? { courseId } : {}),
    ...(planId ? { planId } : {}),
    ...(subjectId ? { subjectId } : {}),
  }
  const [total, rows] = await Promise.all([
    db.testPaper.count({ where }),
    db.testPaper.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        course: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        _count: { select: { assignments: true } },
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

  // Validate course/plan/subject consistency
  const [plan, subject, planSubject] = await Promise.all([
    db.plan.findUnique({ where: { id: data.planId }, select: { id: true, courseId: true } }),
    db.subject.findUnique({ where: { id: data.subjectId }, select: { id: true, courseId: true } }),
    db.planSubject.findUnique({
      where: { planId_subjectId: { planId: data.planId, subjectId: data.subjectId } },
      select: { id: true },
    }),
  ])
  if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 400 })
  if (!subject) return NextResponse.json({ error: 'Subject not found.' }, { status: 400 })
  if (plan.courseId !== data.courseId) return NextResponse.json({ error: 'Plan does not belong to the selected course.' }, { status: 400 })
  if (subject.courseId !== data.courseId) return NextResponse.json({ error: 'Subject does not belong to the selected course.' }, { status: 400 })
  if (!planSubject) return NextResponse.json({ error: 'Selected subject is not part of the selected plan.' }, { status: 400 })

  let slug = data.slug || slugify(data.title)
  const existing = await db.testPaper.findUnique({ where: { slug }, select: { id: true } })
  if (existing) {
    let i = 1
    while (true) {
      const cand = `${slug}-${i}`
      const ex = await db.testPaper.findUnique({ where: { slug: cand }, select: { id: true } })
      if (!ex) { slug = cand; break }
      i++
    }
  }

  const paper = await db.testPaper.create({
    data: {
      title: data.title,
      slug,
      courseId: data.courseId,
      planId: data.planId,
      subjectId: data.subjectId,
      planSubjectId: planSubject.id,
      description: data.description ?? null,
      questionFileKey: data.questionFileKey ?? null,
      answerFileKey: data.answerFileKey ?? null,
      allowAnswerDownload: data.allowAnswerDownload,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      totalMarks: data.totalMarks,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    },
    select: { id: true, slug: true },
  })
  return NextResponse.json({ ok: true, paper })
}
