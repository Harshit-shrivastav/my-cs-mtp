// MY CS MTP — Admin notifications list + create/send API. ADMIN-only.
// POST fans out NotificationRecipient rows to the chosen audience.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(150, 'Title is too long.'),
  message: z.string().trim().min(1, 'Message is required.').max(5000, 'Message is too long.'),
  audience: z.enum(['ALL', 'COURSE', 'SINGLE'], {
    message: 'Audience must be ALL, COURSE or SINGLE.',
  }),
  courseId: z.string().trim().optional().nullable(),
  targetUserId: z.string().trim().optional().nullable(),
})

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSize = parseInt(u.searchParams.get('pageSize') || '10', 10) || 10

  const [total, notifRows] = await Promise.all([
    db.notification.count(),
    db.notification.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { recipients: true } } },
    }),
  ])

  // courseId/targetUserId are plain strings (no relations on the model) —
  // resolve display names in bulk.
  const courseIds = Array.from(new Set(notifRows.map((r) => r.courseId).filter(Boolean))) as string[]
  const targetIds = Array.from(new Set(notifRows.map((r) => r.targetUserId).filter(Boolean))) as string[]
  const [courses, targets] = await Promise.all([
    courseIds.length
      ? db.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    targetIds.length
      ? db.user.findMany({ where: { id: { in: targetIds } }, select: { id: true, name: true, email: true } })
      : Promise.resolve([]),
  ])
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const targetById = new Map(targets.map((t) => [t.id, t]))

  const rows = notifRows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    audience: r.audience,
    createdAt: r.createdAt,
    course: r.courseId ? courseById.get(r.courseId) ?? null : null,
    targetUser: r.targetUserId ? targetById.get(r.targetUserId) ?? null : null,
    recipientCount: r._count.recipients,
  }))

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
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input.' },
      { status: 400 }
    )
  }
  const { title, message, audience } = parsed.data
  const courseId = parsed.data.courseId || null
  const targetUserId = parsed.data.targetUserId || null

  if (audience === 'COURSE' && !courseId) {
    return NextResponse.json({ error: 'courseId is required when audience is COURSE.' }, { status: 400 })
  }
  if (audience === 'SINGLE' && !targetUserId) {
    return NextResponse.json({ error: 'targetUserId is required when audience is SINGLE.' }, { status: 400 })
  }

  let course: { id: string; name: string } | null = null
  if (audience === 'COURSE') {
    course = await db.course.findUnique({ where: { id: courseId! }, select: { id: true, name: true } })
    if (!course) return NextResponse.json({ error: 'Selected course was not found.' }, { status: 400 })
  }

  let targetUser: { id: string; name: string | null; email: string } | null = null
  if (audience === 'SINGLE') {
    targetUser = await db.user.findFirst({
      where: { id: targetUserId!, role: 'STUDENT' },
      select: { id: true, name: true, email: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'Selected student was not found.' }, { status: 400 })
    }
  }

  // Resolve the recipient user ids by audience.
  let recipientIds: string[] = []
  if (audience === 'ALL') {
    const students = await db.user.findMany({
      where: { role: 'STUDENT', isBlocked: false },
      select: { id: true },
    })
    recipientIds = students.map((s) => s.id)
  } else if (audience === 'COURSE') {
    const students = await db.user.findMany({
      where: { role: 'STUDENT', isBlocked: false, courseId },
      select: { id: true },
    })
    recipientIds = students.map((s) => s.id)
  } else if (targetUser) {
    recipientIds = [targetUser.id]
  }

  if (recipientIds.length === 0) {
    return NextResponse.json(
      { error: 'No students matched this audience — nothing was sent.' },
      { status: 400 }
    )
  }

  const notification = await db.notification.create({
    data: {
      title,
      message,
      audience,
      courseId: audience === 'COURSE' ? courseId : null,
      targetUserId: audience === 'SINGLE' ? targetUserId : null,
      createdBy: ctx.user.id,
      recipients: {
        create: recipientIds.map((userId) => ({ userId })),
      },
    },
    select: { id: true, title: true, audience: true },
  })

  return NextResponse.json({
    ok: true,
    notification,
    recipientCount: recipientIds.length,
  })
}
