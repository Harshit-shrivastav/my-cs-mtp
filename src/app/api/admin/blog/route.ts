// MY CS MTP — Admin blog CRUD API (list + create). ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { slugify } from '@/lib/utils-extra'
import { uniqueModelSlug } from '@/lib/admin-slugs'

export const dynamic = 'force-dynamic'

const seoFields = {
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(400).optional().nullable(),
  seoKeywords: z.string().max(300).optional().nullable(),
  ogImageKey: z.string().optional().nullable(),
}

const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(300, 'Title is too long.'),
  slug: z.string().optional(),
  excerpt: z.string().max(600).optional().nullable(),
  content: z.string().min(1, 'Content is required.'),
  coverImageKey: z.string().optional().nullable(),
  coverImageAlt: z.string().max(300).optional().nullable(),
  authorName: z.string().max(120).optional().nullable(),
  tags: z.string().max(300).optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
  publishedAt: z.string().optional(),
  aiGenerated: z.boolean().optional().default(false),
  ...seoFields,
})

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim()
  const statusParam = u.searchParams.get('status') || ''
  const status = statusParam === 'DRAFT' || statusParam === 'PUBLISHED' ? statusParam : null
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSizeRaw = parseInt(u.searchParams.get('pageSize') || '10', 10)
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(pageSizeRaw, 100) : 10

  const where = {
    ...(q
      ? { OR: [{ title: { contains: q } }, { slug: { contains: q } }] }
      : {}),
    ...(status ? { status } : {}),
  }

  const [total, rows] = await Promise.all([
    db.blogPost.count({ where }),
    db.blogPost.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        authorName: true,
        tags: true,
        excerpt: true,
        publishedAt: true,
        aiGenerated: true,
        createdAt: true,
        updatedAt: true,
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
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }
  const data = parsed.data

  // Slug: from explicit slug or the title; ensure unique (-1, -2, …)
  let slug = slugify(data.slug || data.title)
  if (!slug) return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
  slug = await uniqueModelSlug('blogPost', slug)

  // publishedAt: server-set on first publish
  let publishedAt: Date | null = null
  if (data.status === 'PUBLISHED') {
    publishedAt = data.publishedAt && !isNaN(new Date(data.publishedAt).getTime())
      ? new Date(data.publishedAt)
      : new Date()
  }

  const post = await db.blogPost.create({
    data: {
      title: data.title,
      slug,
      excerpt: data.excerpt ?? null,
      content: data.content,
      coverImageKey: data.coverImageKey ?? null,
      coverImageAlt: data.coverImageAlt ?? null,
      authorName: data.authorName ?? null,
      tags: data.tags ?? null,
      status: data.status,
      publishedAt,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      seoKeywords: data.seoKeywords ?? null,
      ogImageKey: data.ogImageKey ?? null,
      aiGenerated: data.aiGenerated,
    },
    select: { id: true, slug: true, status: true, publishedAt: true },
  })

  return NextResponse.json({ ok: true, post })
}
