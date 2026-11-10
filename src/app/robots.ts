// MY CS MTP — robots.txt (Next.js 16 robots.ts convention)
// Disallows private/admin paths and points to the sitemap.
import type { MetadataRoute } from 'next'
import { siteBaseUrl } from '@/lib/site-url'

const DISALLOWED = [
  '/admin',
  '/dashboard',
  '/examiner',
  '/cart',
  '/login',
  '/signup',
  '/payment-success',
  '/payment-failed',
  '/payment',
  '/api',
  '/verify',
]

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await siteBaseUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
