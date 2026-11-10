// MY CS MTP — Admin schedules CRUD API. ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const schema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional().nullable(),
  planId: z.string().min(1, 'Plan is required.'),
  courseId: z.string().min(1, 'Course is required.'),
  scheduleNameId: z.string().nullable().optional(),
  fileKey: z.string().nullable().optional(),
  isPublic: z.boolean().optional().default(false),
  publishedAt: z.string().nullable().optional(),
})

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim()
  const courseId = u.searchParams.get('courseId') || undefined
  const planId = u.searchParams.get('planId') || undefined
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSize = parseInt(u.searchParams.get('pageSize') || '10', 10) || 10

  const where: any = {
    ...(q ? { title: { contains: q } } : {}),
    ...(courseId ? { courseId } : {}),
    ...(planId ? { planId } : {}),
  }

  const [total, rows] = await Promise.all([
    db.schedule.count({ where }),
    db.schedule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        plan: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        scheduleName: { select: { id: true, name: true } },
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

  const [plan, course] = await Promise.all([
    db.plan.findUnique({ where: { id: data.planId }, select: { id: true, courseId: true } }),
    db.course.findUnique({ where: { id: data.courseId }, select: { id: true } }),
  ])
  if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 400 })
  if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 400 })
  if (plan.courseId !== data.courseId) return NextResponse.json({ error: 'Plan does not belong to the selected course.' }, { status: 400 })

  if (data.scheduleNameId) {
    const sn = await db.scheduleName.findUnique({ where: { id: data.scheduleNameId }, select: { id: true, planId: true } })
    if (!sn) return NextResponse.json({ error: 'Schedule name not found.' }, { status: 400 })
    if (sn.planId !== data.planId) return NextResponse.json({ error: 'Schedule name does not belong to the selected plan.' }, { status: 400 })
  }

  const schedule = await db.schedule.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      planId: data.planId,
      courseId: data.courseId,
      scheduleNameId: data.scheduleNameId || null,
      fileKey: data.fileKey ?? null,
      isPublic: data.isPublic,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    },
    select: { id: true },
  })
  return NextResponse.json({ ok: true, schedule })
}
