// MY CS MTP — Admin: regenerate course slug from current name. ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { slugify } from '@/lib/utils-extra'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const course = await db.course.findUnique({ where: { id }, select: { id: true, name: true, slug: true } })
  if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 404 })

  let slug = slugify(course.name)
  if (slug === course.slug) return NextResponse.json({ ok: true, slug: course.slug, unchanged: true })

  // Ensure uniqueness
  const existing = await db.course.findFirst({ where: { slug, NOT: { id } }, select: { id: true } })
  if (existing) {
    let i = 1
    while (true) {
      const cand = `${slug}-${i}`
      const ex = await db.course.findFirst({ where: { slug: cand, NOT: { id } }, select: { id: true } })
      if (!ex) { slug = cand; break }
      i++
    }
  }

  await db.course.update({ where: { id }, data: { slug } })
  return NextResponse.json({ ok: true, slug })
}
