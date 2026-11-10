// MY CS MTP — Admin free resource detail (PATCH + DELETE). ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  courseId: z.string().nullable().optional(),
  fileKey: z.string().nullable().optional(),
  imageKey: z.string().nullable().optional(),
  imageAlt: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
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

  const r = await db.freeResource.findUnique({ where: { id }, select: { id: true } })
  if (!r) return NextResponse.json({ error: 'Resource not found.' }, { status: 404 })

  if (data.courseId) {
    const course = await db.course.findUnique({ where: { id: data.courseId }, select: { id: true } })
    if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 400 })
  }

  const updated = await db.freeResource.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.courseId !== undefined ? { courseId: data.courseId } : {}),
      ...(data.fileKey !== undefined ? { fileKey: data.fileKey } : {}),
      ...(data.imageKey !== undefined ? { imageKey: data.imageKey } : {}),
      ...(data.imageAlt !== undefined ? { imageAlt: data.imageAlt } : {}),
      ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    select: { id: true },
  })
  return NextResponse.json({ ok: true, resource: updated })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const r = await db.freeResource.findUnique({ where: { id }, select: { id: true } })
  if (!r) return NextResponse.json({ error: 'Resource not found.' }, { status: 404 })

  await db.freeResource.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
