// MY CS MTP — Admin custom pages CRUD API (list + create). ADMIN-only.
// Reserved slugs (real routes of the site) are rejected with a clear error.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { slugify } from '@/lib/utils-extra'
import { uniqueModelSlug } from '@/lib/admin-slugs'
import { isReservedPageSlug } from '@/lib/reserved-slugs'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(300, 'Title is too long.'),
  slug: z.string().optional(),
  content: z.string().min(1, 'Content is required.'),
  showInHeader: z.boolean().optional().default(false),
  showInFooter: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(400).optional().nullable(),
  seoKeywords: z.string().max(300).optional().nullable(),
  ogImageKey: z.string().optional().nullable(),
})

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim()
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSizeRaw = parseInt(u.searchParams.get('pageSize') || '10', 10)
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(pageSizeRaw, 100) : 10

  const where = q ? { OR: [{ title: { contains: q } }, { slug: { contains: q } }] } : {}

  const [total, rows] = await Promise.all([
    db.customPage.count({ where }),
    db.customPage.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        showInHeader: true,
        showInFooter: true,
        isActive: true,
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

  const slug = slugify(data.slug || data.title)
  if (!slug) return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
  if (isReservedPageSlug(slug)) {
    return NextResponse.json({ error: 'This slug is reserved.' }, { status: 400 })
  }
  const finalSlug = await uniqueModelSlug('customPage', slug)

  const page = await db.customPage.create({
    data: {
      title: data.title,
      slug: finalSlug,
      content: data.content,
      showInHeader: data.showInHeader,
      showInFooter: data.showInFooter,
      isActive: data.isActive,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      seoKeywords: data.seoKeywords ?? null,
      ogImageKey: data.ogImageKey ?? null,
    },
    select: { id: true, slug: true },
  })

  return NextResponse.json({ ok: true, page })
}
