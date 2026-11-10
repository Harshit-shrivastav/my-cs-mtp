// MY CS MTP — /blog/tag/[tag]
// Server component. Posts tagged with a given tag (case-insensitive).
import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { publicUrl } from '@/lib/storage'
import { PublicBreadcrumbs } from '@/components/public/breadcrumbs'
import { JsonLd, breadcrumbJsonLd } from '@/components/public/seo'

export const revalidate = 60

interface Params { params: Promise<{ tag: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  const title = `${decoded} — CS Blog Posts`
  const description = `All blog posts tagged "${decoded}" on MY CS MTP — Company Secretary exam preparation, mock test strategy and revision tips.`
  return {
    title,
    description,
    alternates: { canonical: `/blog/tag/${tag}` },
    openGraph: { title, description, url: `/blog/tag/${tag}`, type: 'website', images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MY CS MTP' }] },
  }
}

export default async function BlogTagPage({ params }: Params) {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)

  // SQLite: case-insensitive contains is hard. Pull recent published posts and filter by tag in JS.
  const recent = await db.blogPost.findMany({
    where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: 'desc' },
    take: 100,
    select: {
      id: true, title: true, slug: true, excerpt: true,
      coverImageKey: true, coverImageAlt: true, tags: true,
      publishedAt: true, authorName: true,
    },
  })
  const tagLower = decoded.toLowerCase()
  const posts = recent.filter((p) => (p.tags || '').split(',').map((t) => t.trim().toLowerCase()).includes(tagLower))

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Blog', href: '/blog' },
    { name: `#${decoded}` },
  ]

  return (
    <>
      <PublicBreadcrumbs items={crumbs} />

      <section className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="mb-8">
          <Badge variant="secondary" className="mb-3">Tag</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Posts tagged &quot;{decoded}&quot;</h1>
          <p className="mt-3 text-muted-foreground">
            {posts.length === 0
              ? 'No posts have this tag yet.'
              : `${posts.length} post${posts.length === 1 ? '' : 's'} tagged "${decoded}".`}
          </p>
        </div>

        {posts.length === 0 ? (
          <Card>
            <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
              No posts found. <Link href="/blog" className="text-foreground hover:underline">Browse all posts</Link>.
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    </CardContent>
                  </Link>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  )
}
