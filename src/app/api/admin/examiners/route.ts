// MY CS MTP — Admin examiners list + create API. ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { hashPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short.').max(120, 'Name is too long.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  mobile: z
    .string()
    .trim()
    .max(15, 'Enter a valid mobile number.')
    .regex(/^[0-9+\-\s]*$/, 'Enter a valid mobile number.')
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[A-Za-z]/, 'Password must include a letter.')
    .regex(/[0-9]/, 'Password must include a number.'),
  courseId: z.string().trim().optional().nullable().transform((v) => (v ? v : null)),
})

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim()
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSize = parseInt(u.searchParams.get('pageSize') || '10', 10) || 10

  const where = {
    role: 'EXAMINER' as const,
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { mobile: { contains: q } },
          ],
        }
      : {}),
  }

  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        isBlocked: true,
        createdAt: true,
        course: { select: { id: true, name: true } },
        _count: { select: { examinerPapers: true, examinerSubjects: true } },
      },
    }),
  ])

  // Evaluated-assignment counts per examiner (filtered relation counts are not
  // available here, so aggregate in one groupBy query).
  const ids = rows.map((r) => r.id)
  const evalCounts = new Map<string, number>()
  if (ids.length > 0) {
    const grouped = await db.assignment.groupBy({
      by: ['examinerId'],
      where: { examinerId: { in: ids }, status: 'EVALUATED' },
      _count: { _all: true },
    })
    for (const g of grouped) {
      if (g.examinerId) evalCounts.set(g.examinerId, g._count._all)
    }
  }

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      mobile: r.mobile,
      isBlocked: r.isBlocked,
      createdAt: r.createdAt,
      course: r.course,
      papersAssigned: r._count.examinerPapers,
      subjectsAssigned: r._count.examinerSubjects,
      evaluationsDone: evalCounts.get(r.id) || 0,
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
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input.' },
      { status: 400 }
    )
  }
  const { name, email, mobile, password, courseId } = parsed.data

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered.' }, { status: 400 })
  }

  if (courseId) {
    const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true } })
    if (!course) return NextResponse.json({ error: 'Selected course was not found.' }, { status: 400 })
  }

  const passwordHash = await hashPassword(password)
  const examiner = await db.user.create({
    data: {
      name,
      email,
      mobile,
      passwordHash,
      role: 'EXAMINER',
      courseId,
      emailVerified: new Date(), // admin-created accounts are trusted
    },
    select: { id: true, email: true, name: true },
  })

  return NextResponse.json({ ok: true, examiner })
}
