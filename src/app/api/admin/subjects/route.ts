// MY CS MTP — Admin subjects CRUD API. ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { slugify } from '@/lib/utils-extra'

export const dynamic = 'force-dynamic'

const schema = z.object({
  name: z.string().min(1, 'Name is required.'),
  slug: z.string().min(1, 'Slug is required.'),
  courseId: z.string().min(1, 'Course is required.'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
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

  const where = {
    ...(q ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] } : {}),
    ...(courseId ? { courseId } : {}),
  }
  const [total, rows] = await Promise.all([
    db.subject.count({ where }),
    db.subject.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        sortOrder: true,
        course: { select: { id: true, name: true } },
        _count: { select: { papers: true, planSubjects: true } },
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

  let slug = data.slug || slugify(data.name)
  const existing = await db.subject.findUnique({ where: { slug }, select: { id: true } })
  if (existing) {
    let i = 1
    while (true) {
      const cand = `${slug}-${i}`
      const ex = await db.subject.findUnique({ where: { slug: cand }, select: { id: true } })
      if (!ex) { slug = cand; break }
      i++
    }
  }

  const subject = await db.subject.create({
    data: {
      name: data.name,
      slug,
      courseId: data.courseId,
      description: data.description ?? null,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    },
    select: { id: true, slug: true },
  })
  return NextResponse.json({ ok: true, subject })
}
