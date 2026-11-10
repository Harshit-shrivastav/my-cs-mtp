// MY CS MTP — /blog
// Server component. Search via ?q=, pagination via ?page=N (12 per page).
import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PublicBreadcrumbs } from '@/components/public/breadcrumbs'
import { JsonLd, breadcrumbJsonLd, siteBaseUrl } from '@/components/public/seo'
import { BlogSearchClient } from '@/components/public/blog-search'
import { publicUrl } from '@/lib/storage'

export const revalidate = 60

const PER_PAGE = 12

export const metadata: Metadata = {
  title: 'CS Exam Preparation Blog — Tips & Strategy',
  description:
    'Articles on CS exam preparation, mock test strategy, syllabus breakdowns and revision tips for CSEET, CS Executive and CS Professional students.',
  keywords: [
    'cs exam blog',
    'cseet preparation blog',
    'cs executive preparation blog',
    'cs professional preparation blog',
    'company secretary preparation',
    'cs mock test strategy',
  ],
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'CS Exam Preparation Blog — Tips & Strategy',
    description:
      'Articles on CS exam preparation, mock test strategy, syllabus breakdowns and revision tips.',
    url: '/blog',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MY CS MTP' }],
  },
}

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams
  const q = (sp.q || '').trim()
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1)

  const where = {
    status: 'PUBLISHED' as const,
    publishedAt: { lte: new Date() },
    ...(q ? {
      OR: [
        { title: { contains: q } },
        { excerpt: { contains: q } },
        { tags: { contains: q } },
      ],
    } : {}),
  }

  const [total, posts, tagRows] = await Promise.all([
    db.blogPost.count({ where }),
    db.blogPost.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, title: true, slug: true, excerpt: true,
        coverImageKey: true, coverImageAlt: true, tags: true,
        publishedAt: true, authorName: true,
      },
    }),
    db.blogPost.findMany({
      where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } },
      select: { tags: true },
    }),
  ])

  // Tag cloud
  const tagMap = new Map<string, number>()
  for (const r of tagRows) {
    if (!r.tags) continue
    for (const t of r.tags.split(',')) {
      const tt = t.trim()
      if (!tt) continue
      tagMap.set(tt, (tagMap.get(tt) || 0) + 1)
    }
  }
  const tags = Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 25)

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Blog' },
  ]

  return (
    <>
      <PublicBreadcrumbs items={crumbs} />

      <section className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">MY CS MTP Blog</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Strategy guides, syllabus breakdowns, mock test tips and revision hacks for Company Secretary students preparing for CSEET, CS Executive and CS Professional.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Posts */}
          <div className="lg:col-span-3">
            <BlogSearchClient initialQ={q} />

            <div className="mt-4 text-sm text-muted-foreground">
              {total === 0
                ? (q ? `No posts found for "${q}".` : 'No posts yet.')
                : `${total} post${total === 1 ? '' : 's'}${q ? ` matching "${q}"` : ''} — page ${page} of ${totalPages}.`}
            </div>

            {posts.length === 0 ? (
              <Card className="mt-4">
                <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
                  {q ? 'Try a different search term, or browse the tags on the right.' : 'Posts will appear here once published.'}
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {posts.map((p) => {
                  const imgUrl = p.coverImageKey ? publicUrl(p.coverImageKey) : null
                  return (
                    <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <Link href={`/blog/${p.slug}`} className="block">
                        {imgUrl && (
                          <img src={imgUrl} alt={p.coverImageAlt || p.title} className="w-full h-40 object-cover" />
                        )}
                        <CardContent className="pt-4">
                          <div className="text-xs text-muted-foreground mb-1">
                            {p.publishedAt && new Date(p.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          <h3 className="font-semibold leading-snug line-clamp-2">{p.title}</h3>
                          {p.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{p.excerpt}</p>}
                          {p.tags && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {p.tags.split(',').slice(0, 3).map((t) => (
                                <Badge key={t} variant="outline" className="text-[10px]">{t.trim()}</Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Link>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button asChild variant="outline" disabled={page === 1}>
                  <Link href={`/blog?${new URLSearchParams({ ...(q ? { q } : {}), page: String(Math.max(1, page - 1)) }).toString()}`} aria-disabled={page === 1}>
                    Previous
                  </Link>
                </Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button asChild variant="outline" disabled={page === totalPages}>
                  <Link href={`/blog?${new URLSearchParams({ ...(q ? { q } : {}), page: String(Math.min(totalPages, page + 1)) }).toString()}`} aria-disabled={page === totalPages}>
                    Next
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Tag cloud */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20">
              <h2 className="font-semibold mb-3">Tags</h2>
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map(([t, count]) => (
                    <Link key={t} href={`/blog/tag/${encodeURIComponent(t)}`}>
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                        {t} <span className="ml-1 text-muted-foreground">{count}</span>
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  )
}
