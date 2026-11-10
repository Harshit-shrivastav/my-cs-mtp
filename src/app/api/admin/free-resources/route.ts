// MY CS MTP — Admin free resources CRUD API. ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const schema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional().nullable(),
  courseId: z.string().nullable().optional(),
  fileKey: z.string().nullable().optional(),
  imageKey: z.string().nullable().optional(),
  imageAlt: z.string().optional().nullable(),
  isPublic: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
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
    db.freeResource.count({ where }),
    db.freeResource.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        description: true,
        courseId: true,
        fileKey: true,
        imageKey: true,
        imageAlt: true,
        isPublic: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        course: { select: { id: true, name: true } },
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

  if (data.courseId) {
    const course = await db.course.findUnique({ where: { id: data.courseId }, select: { id: true } })
    if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 400 })
  }

  const resource = await db.freeResource.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      courseId: data.courseId || null,
      fileKey: data.fileKey ?? null,
      imageKey: data.imageKey ?? null,
      imageAlt: data.imageAlt ?? null,
      isPublic: data.isPublic,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
    select: { id: true },
  })
  return NextResponse.json({ ok: true, resource })
}
