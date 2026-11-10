// MY CS MTP — llms.txt
// A simple plain-text summary of the site for LLM crawlers.
import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/settings'
import { siteBaseUrl } from '@/lib/site-url'

export const revalidate = 3600

export async function GET(req: Request) {
  const settings = await getSettings()
  const siteName = settings.siteName || 'MY CS MTP'
  const tagline = settings.tagline || 'Online test series for CS students — CSEET, Executive & Professional'
  const base = await siteBaseUrl(req)

  // Markdown-style summary as per the llms.txt spec
  const lines = [
    `# ${siteName}`,
    ``,
    `> ${tagline}`,
    ``,
    `## Main pages`,
    `- / [Home]`,
    `- /cs-test-series [CS Test Series]`,
    `- /cseet-test-series [CSEET Test Series]`,
    `- /cs-executive-test-series [CS Executive Test Series]`,
    `- /cs-professional-test-series [CS Professional Test Series]`,
    `- /pricing [Pricing]`,
    `- /cstestseriesschedule [Schedules]`,
    `- /cs-test-series-review [Reviews]`,
    `- /blog [Blog]`,
    ``,
    `## About`,
    `- Site URL: ${base}`,
    `- Contact email: ${settings.supportEmail}`,
    `- WhatsApp: ${settings.whatsappLink}`,
    ``,
    `## Optional`,
    `- /sitemap.xml`,
    `- /feed.xml`,
    `- /robots.txt`,
    `- /manifest.webmanifest`,
    ``,
  ]

  const body = lines.join('\n')

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
