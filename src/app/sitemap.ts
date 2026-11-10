// MY CS MTP — Dynamic sitemap (Next.js 16 sitemap.ts convention)
// Generates an XML sitemap covering all public, indexable URLs.
import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { siteBaseUrl } from '@/lib/site-url'

// Reserved slugs that the /[slug] catch-all must not match — these are not
// actual CustomPages, so we exclude them from the sitemap.
const RESERVED_SLUGS = new Set([
  'blog', 'pricing', 'cs-test-series', 'cseet-test-series',
  'cs-executive-test-series', 'cs-professional-test-series',
  'cs-test-series-review', 'cstestseriesschedule',
  'course', 'plan', 'cart', 'dashboard', 'admin', 'examiner',
  'login', 'signup', 'verify', 'forgot-password', 'reset-password',
  'payment-success', 'payment-failed', 'payment',
  'api', '_next', 'favicon.svg', 'favicon.ico', 'logo.svg',
  'robots.txt', 'manifest.webmanifest', 'sitemap.xml', 'feed.xml',
  'llms.txt', 'opensearch.xml', 'uploads',
])

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await siteBaseUrl()
  const now = new Date()

  const [courses, plans, posts, pages] = await Promise.all([
    db.course.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    db.plan.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    db.blogPost.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true, publishedAt: true } }),
    db.customPage.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ])

  const landingPages = [
    '/cs-test-series',
    '/cseet-test-series',
    '/cs-executive-test-series',
    '/cs-professional-test-series',
    '/cs-test-series-review',
    '/pricing',
    '/cstestseriesschedule',
  ]

  const entries: MetadataRoute.Sitemap = []

  // Home
  entries.push({
    url: `${base}/`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 1.0,
  })

  // Landing pages
  for (const p of landingPages) {
    entries.push({
      url: `${base}${p}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    })
  }

  // Active courses
  for (const c of courses) {
    entries.push({
      url: `${base}/course/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  // Active plans
  for (const p of plans) {
    entries.push({
      url: `${base}/plan/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  // Published blog posts
  for (const b of posts) {
    entries.push({
      url: `${base}/blog/${b.slug}`,
      lastModified: b.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }

  // Active custom pages (skip reserved slugs defensively)
  for (const p of pages) {
    if (RESERVED_SLUGS.has(p.slug)) continue
    entries.push({
      url: `${base}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  }

  return entries
}
