// MY CS MTP — Admin custom page detail (GET + PATCH + DELETE). ADMIN-only.
// Reserved slugs are rejected; slug changes maintain a Redirect row
// (/{old} → /{new}, permanent).
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { slugify } from '@/lib/utils-extra'
import { uniqueModelSlug, maintainSlugRedirects } from '@/lib/admin-slugs'
import { isReservedPageSlug } from '@/lib/reserved-slugs'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(300, 'Title is too long.').optional(),
  slug: z.string().optional(),
  content: z.string().min(1, 'Content is required.').optional(),
  showInHeader: z.boolean().optional(),
  showInFooter: z.boolean().optional(),
  isActive: z.boolean().optional(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(400).optional().nullable(),
  seoKeywords: z.string().max(300).optional().nullable(),
  ogImageKey: z.string().optional().nullable(),
})

export async function GET(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const page = await db.customPage.findUnique({ where: { id } })
  if (!page) return NextResponse.json({ error: 'Custom page not found.' }, { status: 404 })

  return NextResponse.json({ ok: true, page })
}

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
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }
  const data = parsed.data

  const page = await db.customPage.findUnique({
    where: { id },
    select: { id: true, slug: true },
  })
  if (!page) return NextResponse.json({ error: 'Custom page not found.' }, { status: 404 })

  // ---- Slug handling (reserved guard + unique suffix + redirect) ----
  let finalSlug = page.slug
  let slugChanged = false
  if (data.slug !== undefined) {
    const wanted = slugify(data.slug)
    if (!wanted) {
      return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
    }
    if (wanted !== page.slug) {
      if (isReservedPageSlug(wanted)) {
        return NextResponse.json({ error: 'This slug is reserved.' }, { status: 400 })
      }
      finalSlug = await uniqueModelSlug('customPage', wanted, id)
      slugChanged = finalSlug !== page.slug
    }
  }

  const updated = await db.customPage.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      slug: finalSlug,
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.showInHeader !== undefined ? { showInHeader: data.showInHeader } : {}),
      ...(data.showInFooter !== undefined ? { showInFooter: data.showInFooter } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
      ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
      ...(data.seoKeywords !== undefined ? { seoKeywords: data.seoKeywords } : {}),
      ...(data.ogImageKey !== undefined ? { ogImageKey: data.ogImageKey } : {}),
    },
    select: { id: true, slug: true },
  })

  if (slugChanged) {
    try {
      await maintainSlugRedirects(`/${page.slug}`, `/${finalSlug}`)
    } catch (e) {
      console.error('custom-pages: failed to maintain redirect for slug change', e)
    }
  }

  return NextResponse.json({ ok: true, page: updated, slugChanged })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const page = await db.customPage.findUnique({ where: { id }, select: { id: true } })
  if (!page) return NextResponse.json({ error: 'Custom page not found.' }, { status: 404 })

  await db.customPage.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
