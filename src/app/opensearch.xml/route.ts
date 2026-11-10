// MY CS MTP — OpenSearch description document at /opensearch.xml
// Lets browsers and search clients add the site as a search engine
// pointing to /blog?q={searchTerms}.
import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/settings'

export const revalidate = 3600

function siteBaseUrl(): string {
  return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const settings = await getSettings()
  const base = siteBaseUrl()
  const siteName = settings.siteName || 'MY CS MTP'

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${escapeXml(siteName)}</ShortName>
  <Description>${escapeXml(settings.tagline || 'CS test series for CSEET, Executive and Professional students')}</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <OutputEncoding>UTF-8</OutputEncoding>
  <Url type="text/html" method="get" template="${escapeXml(base + '/blog?q={searchTerms}')}"/>
  <Url type="application/rss+xml" method="get" template="${escapeXml(base + '/feed.xml')}"/>
  <Image height="16" width="16" type="image/svg+xml">${escapeXml(base + '/favicon.svg')}</Image>
</OpenSearchDescription>
`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/opensearchdescription+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
