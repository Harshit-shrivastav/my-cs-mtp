// MY CS MTP — /blog/[slug]
// Server component. Single blog post with markdown content, TOC, related posts, share links.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, User } from 'lucide-react'
import { publicUrl } from '@/lib/storage'
import { PublicBreadcrumbs } from '@/components/public/breadcrumbs'
import { JsonLd, breadcrumbJsonLd, absUrl } from '@/components/public/seo'
import { ShareLinksClient } from '@/components/public/share-links'
import { extractToc, slugifyHeading } from '@/lib/markdown-toc'

export const revalidate = 60

interface Params { params: Promise<{ slug: string }> }

async function getPost(slug: string) {
  return db.blogPost.findUnique({
    where: { slug },
  })
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const post = await db.blogPost.findUnique({ where: { slug } })
  if (!post || post.status !== 'PUBLISHED' || !post.publishedAt || post.publishedAt > new Date()) {
    return { title: 'Post not found' }
  }
  const title = post.seoTitle || post.title
  const description = post.seoDescription || post.excerpt || post.title
  return {
    title,
    description,
    keywords: post.seoKeywords ? post.seoKeywords.split(',').map((s) => s.trim()) : undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      url: `/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.authorName ? [post.authorName] : undefined,
      tags: post.tags ? post.tags.split(',').map((t) => t.trim()) : undefined,
      ...(post.ogImageKey
        ? { images: [{ url: `/api/storage/download?key=${encodeURIComponent(post.ogImageKey)}` }] }
        : post.coverImageKey
          ? { images: [{ url: `/api/storage/download?key=${encodeURIComponent(post.coverImageKey)}` }] }
          : { images: [{ url: '/og-default.png', width: 1200, height: 630, alt: post.title }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post || post.status !== 'PUBLISHED' || !post.publishedAt || post.publishedAt > new Date()) {
    notFound()
  }

  const tags = (post.tags || '').split(',').map((t) => t.trim()).filter(Boolean)

  // Related posts: 3 most recent posts with at least one matching tag (excluding self)
  let related: Awaited<ReturnType<typeof db.blogPost.findMany>> = []
  if (tags.length > 0) {
    // SQLite doesn't have native array-contains; fetch recent published posts and filter by tag match
    const recent = await db.blogPost.findMany({
      where: { status: 'PUBLISHED', publishedAt: { lte: new Date() }, slug: { not: post.slug } },
      orderBy: { publishedAt: 'desc' },
      take: 30,
      select: {
        id: true, title: true, slug: true, excerpt: true,
        coverImageKey: true, coverImageAlt: true, tags: true,
        publishedAt: true,
      },
    })
    const tagSet = new Set(tags.map((t) => t.toLowerCase()))
    related = recent
      .filter((p) => (p.tags || '').split(',').some((t) => tagSet.has(t.trim().toLowerCase())))
      .slice(0, 3)
  }

  // If a tag matches a course slug, link to that course
  const matchingCourse = await (async () => {
    if (tags.length === 0) return null
    const c = await db.course.findFirst({
      where: { isActive: true, slug: { in: tags.map((t) => t.toLowerCase()) } },
      select: { id: true, name: true, slug: true },
    })
    return c
  })()

  const toc = extractToc(post.content)
  const imageUrl = post.coverImageKey ? publicUrl(post.coverImageKey) : null

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Blog', href: '/blog' },
    { name: post.title },
  ]

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.title,
    image: imageUrl ? [absUrl(imageUrl)] : undefined,
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { '@type': 'Person', name: post.authorName || 'MY CS MTP Team' },
    publisher: {
      '@type': 'Organization',
      name: 'MY CS MTP',
      logo: { '@type': 'ImageObject', url: absUrl('/logo.svg') },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absUrl(`/blog/${post.slug}`) },
    keywords: tags.join(', '),
  }

  return (
    <>
      <PublicBreadcrumbs items={crumbs} />

      <article className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main column */}
          <div className="lg:col-span-3">
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((t) => (
                <Link key={t} href={`/blog/tag/${encodeURIComponent(t)}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">{t}</Badge>
                </Link>
              ))}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">{post.title}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
              {post.publishedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {post.authorName && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {post.authorName}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <ShareLinksClient url={`/blog/${post.slug}`} title={post.title} />
              </span>
            </div>

            {imageUrl && (
              <img src={imageUrl} alt={post.coverImageAlt || post.title} className="mt-6 rounded-lg border w-full max-h-96 object-cover" />
            )}

            {post.excerpt && (
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed font-medium">{post.excerpt}</p>
            )}

            <div className="prose prose-sm sm:prose-base max-w-none mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-relaxed [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-foreground [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto">
                <ReactMarkdown
                  components={{
                    a: ({ href, children, ...rest }) => {
                      if (!href) return <a>{children}</a>
                      const isInternal = href.startsWith('/') || href.startsWith('#')
                      return isInternal ? (
                        <Link href={href}>{children}</Link>
                      ) : (
                        <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>
                      )
                    },
                    // Inject ids on h2–h6 so the TOC sidebar anchor links actually work.
                    h2: ({ children }) => {
                      const text = String(children ?? '')
                      return <h2 id={slugifyHeading(text)}>{children}</h2>
                    },
                    h3: ({ children }) => {
                      const text = String(children ?? '')
                      return <h3 id={slugifyHeading(text)}>{children}</h3>
                    },
                    h4: ({ children }) => {
                      const text = String(children ?? '')
                      return <h4 id={slugifyHeading(text)}>{children}</h4>
                    },
                    h5: ({ children }) => {
                      const text = String(children ?? '')
                      return <h5 id={slugifyHeading(text)}>{children}</h5>
                    },
                    h6: ({ children }) => {
                      const text = String(children ?? '')
                      return <h6 id={slugifyHeading(text)}>{children}</h6>
                    },
                  }}
                >
                  {post.content}
                </ReactMarkdown>
              </div>

            {matchingCourse && (
              <div className="mt-8 border rounded-lg p-4 bg-muted/30">
                <div className="text-sm text-muted-foreground">This post is about</div>
                <h3 className="font-semibold mt-1">{matchingCourse.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Check out our {matchingCourse.name} test series with hand-evaluated mock tests.
                </p>
                <Button asChild size="sm" className="mt-3">
                  <Link href={`/course/${matchingCourse.slug}`}>View {matchingCourse.name} plans</Link>
                </Button>
              </div>
            )}

            {/* Related posts */}
            {related.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-bold mb-4">Related posts</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  {related.map((r) => {
                    const rImg = r.coverImageKey ? publicUrl(r.coverImageKey) : null
                    return (
                      <Card key={r.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <Link href={`/blog/${r.slug}`}>
                          {rImg && (
                            <img src={rImg} alt={r.coverImageAlt || r.title} className="w-full h-32 object-cover" />
                          )}
                          <CardContent className="pt-4">
                            <div className="text-xs text-muted-foreground mb-1">
                              {r.publishedAt && new Date(r.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <h3 className="font-semibold text-sm leading-snug line-clamp-2">{r.title}</h3>
                          </CardContent>
                        </Link>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* TOC sidebar */}
          {toc.length > 1 && (
            <aside className="hidden lg:block lg:col-span-1">
              <div className="lg:sticky lg:top-20">
                <h2 className="font-semibold mb-3 text-sm">Table of contents</h2>
                <nav className="text-sm space-y-1.5">
                  {toc.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={`block text-muted-foreground hover:text-foreground ${h.level === 3 ? 'pl-3' : h.level === 4 ? 'pl-6' : ''}`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </article>

      <JsonLd data={[breadcrumbJsonLd(crumbs), articleLd]} />
    </>
  )
}
