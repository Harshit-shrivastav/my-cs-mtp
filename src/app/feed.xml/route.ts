// MY CS MTP — RSS 2.0 feed at /feed.xml
// Lists every published blog post.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { siteBaseUrl } from '@/lib/site-url'

export const revalidate = 3600 // re-build at most hourly

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function rfc822Date(d: Date): string {
  // Format: Wed, 02 Oct 2002 13:00:00 GMT
  return d.toUTCString()
}

export async function GET(req: Request) {
  const settings = await getSettings()
  const base = await siteBaseUrl(req)
  const siteName = settings.siteName || 'MY CS MTP'
  const channelTitle = `${siteName} Blog`
  const channelDescription = settings.tagline || 'Online test series for CS students — CSEET, Executive & Professional'
  const channelLink = `${base}/blog`

  const posts = await db.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    select: { slug: true, title: true, excerpt: true, publishedAt: true, updatedAt: true },
  })

  const items = posts.map((p) => {
    const url = `${base}/blog/${p.slug}`
    const pub = p.publishedAt || p.updatedAt
    return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${rfc822Date(pub)}</pubDate>
      <description>${escapeXml(p.excerpt || '')}</description>
    </item>`
  })

  const lastBuild = new Date().toUTCString()

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>en-IN</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${escapeXml(base + '/feed.xml')}" rel="self" type="application/rss+xml" />
${items.join('\n')}
  </channel>
</rss>
`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
