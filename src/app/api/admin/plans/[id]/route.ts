// MY CS MTP — Admin plan detail (PATCH + DELETE). ADMIN-only.
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
  tags: z.string().optional().nullable(),
  scheduleFileKey: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoKeywords: z.string().optional().nullable(),
  ogImageKey: z.string().optional().nullable(),
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

  const plan = await db.plan.findUnique({ where: { id }, select: { id: true, slug: true } })
  if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 })

  let finalSlug = plan.slug
  if (data.slug && data.slug !== plan.slug) {
    let slug = data.slug || slugify(data.name || plan.slug)
    const existing = await db.plan.findFirst({ where: { slug, NOT: { id } }, select: { id: true } })
    if (existing) {
      let i = 1
      while (true) {
        const cand = `${slug}-${i}`
        const ex = await db.plan.findFirst({ where: { slug: cand, NOT: { id } }, select: { id: true } })
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

  const updated = await db.plan.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      slug: finalSlug,
      ...(data.courseId !== undefined ? { courseId: data.courseId } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
      ...(data.scheduleFileKey !== undefined ? { scheduleFileKey: data.scheduleFileKey } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
      ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
      ...(data.seoKeywords !== undefined ? { seoKeywords: data.seoKeywords } : {}),
      ...(data.ogImageKey !== undefined ? { ogImageKey: data.ogImageKey } : {}),
    },
    select: { id: true, slug: true },
  })
  return NextResponse.json({ ok: true, plan: updated })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const plan = await db.plan.findUnique({ where: { id }, select: { id: true } })
  if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 })

  await db.plan.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
