// MY CS MTP — Admin subject detail (PATCH + DELETE). ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { slugify } from '@/lib/utils-extra'

export const dynamic = 'force-dynamic'

const schema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  courseId: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
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

  const subject = await db.subject.findUnique({ where: { id }, select: { id: true, slug: true } })
  if (!subject) return NextResponse.json({ error: 'Subject not found.' }, { status: 404 })

  let finalSlug = subject.slug
  if (data.slug && data.slug !== subject.slug) {
    let slug = data.slug || slugify(data.name || subject.slug)
    const existing = await db.subject.findFirst({ where: { slug, NOT: { id } }, select: { id: true } })
    if (existing) {
      let i = 1
      while (true) {
        const cand = `${slug}-${i}`
        const ex = await db.subject.findFirst({ where: { slug: cand, NOT: { id } }, select: { id: true } })
        if (!ex) { slug = cand; break }
        i++
      }
    }
    finalSlug = slug
  }

  if (data.courseId) {
    const course = await db.course.findUnique({ where: { id: data.courseId }, select: { id: true } })
    if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 400 })
  }

  const updated = await db.subject.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      slug: finalSlug,
      ...(data.courseId !== undefined ? { courseId: data.courseId } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
    select: { id: true, slug: true },
  })
  return NextResponse.json({ ok: true, subject: updated })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const subject = await db.subject.findUnique({ where: { id }, select: { id: true } })
  if (!subject) return NextResponse.json({ error: 'Subject not found.' }, { status: 404 })

  await db.subject.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
