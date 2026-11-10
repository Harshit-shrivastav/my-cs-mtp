// MY CS MTP — Admin blog post detail (GET + PATCH + DELETE). ADMIN-only.
// Slug changes create a permanent Redirect row (/blog/old → /blog/new).
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { slugify } from '@/lib/utils-extra'
import { uniqueModelSlug, maintainSlugRedirects } from '@/lib/admin-slugs'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(300, 'Title is too long.').optional(),
  slug: z.string().optional(),
  excerpt: z.string().max(600).optional().nullable(),
  content: z.string().min(1, 'Content is required.').optional(),
  coverImageKey: z.string().optional().nullable(),
  coverImageAlt: z.string().max(300).optional().nullable(),
  authorName: z.string().max(120).optional().nullable(),
  tags: z.string().max(300).optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  publishedAt: z.string().optional(),
  aiGenerated: z.boolean().optional(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(400).optional().nullable(),
  seoKeywords: z.string().max(300).optional().nullable(),
  ogImageKey: z.string().optional().nullable(),
})

export async function GET(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const post = await db.blogPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: 'Blog post not found.' }, { status: 404 })

  return NextResponse.json({ ok: true, post })
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

  const post = await db.blogPost.findUnique({
    where: { id },
    select: { id: true, slug: true, status: true, publishedAt: true },
  })
  if (!post) return NextResponse.json({ error: 'Blog post not found.' }, { status: 404 })

  // ---- Slug handling (unique suffix + redirect on change) ----
  let finalSlug = post.slug
  let slugChanged = false
  if (data.slug !== undefined) {
    const wanted = slugify(data.slug)
    if (wanted && wanted !== post.slug) {
      finalSlug = await uniqueModelSlug('blogPost', wanted, id)
      slugChanged = finalSlug !== post.slug
    }
  }

  // ---- Status / publishedAt handling ----
  const nextStatus = data.status ?? post.status
  let publishedAt: Date | null | undefined = undefined
  if (data.publishedAt !== undefined) {
    publishedAt = data.publishedAt && !isNaN(new Date(data.publishedAt).getTime())
      ? new Date(data.publishedAt)
      : null
  }
  // First publish (either now or on a later save) → stamp publishedAt server-side.
  if (nextStatus === 'PUBLISHED' && !post.publishedAt && publishedAt === undefined) {
    publishedAt = new Date()
  }

  const updated = await db.blogPost.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      slug: finalSlug,
      ...(data.excerpt !== undefined ? { excerpt: data.excerpt } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.coverImageKey !== undefined ? { coverImageKey: data.coverImageKey } : {}),
      ...(data.coverImageAlt !== undefined ? { coverImageAlt: data.coverImageAlt } : {}),
      ...(data.authorName !== undefined ? { authorName: data.authorName } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(publishedAt !== undefined ? { publishedAt } : {}),
      ...(data.aiGenerated !== undefined ? { aiGenerated: data.aiGenerated } : {}),
      ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
      ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
      ...(data.seoKeywords !== undefined ? { seoKeywords: data.seoKeywords } : {}),
      ...(data.ogImageKey !== undefined ? { ogImageKey: data.ogImageKey } : {}),
    },
    select: { id: true, slug: true, status: true, publishedAt: true },
  })

  // 301 redirect maintenance — only when the public URL actually changed.
  if (slugChanged) {
    try {
      await maintainSlugRedirects(`/blog/${post.slug}`, `/blog/${finalSlug}`)
    } catch (e) {
      console.error('blog: failed to maintain redirect for slug change', e)
    }
  }

  return NextResponse.json({ ok: true, post: updated, slugChanged })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const post = await db.blogPost.findUnique({ where: { id }, select: { id: true } })
  if (!post) return NextResponse.json({ error: 'Blog post not found.' }, { status: 404 })

  await db.blogPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
