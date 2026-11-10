// MY CS MTP — Reserved slugs for CustomPage records (pure list, no db import —
// safe to use in client components as well).
/** Slugs that can never be used for a CustomPage — they belong to real routes. */
export const RESERVED_PAGE_SLUGS: string[] = [
  'home',
  'pricing',
  'cs-test-series',
  'cseet-test-series',
  'cs-executive-test-series',
  'cs-professional-test-series',
  'cs-test-series-review',
  'cstestseriesschedule',
  'blog',
  'cart',
  'login',
  'signup',
  'verify',
  'forgot-password',
  'reset-password',
  'admin',
  'dashboard',
  'examiner',
  'payment-success',
  'payment-failed',
  'api',
  'feed.xml',
  'sitemap.xml',
  'robots.txt',
  'llms.txt',
  'opensearch.xml',
  'manifest.webmanifest',
]

export function isReservedPageSlug(slug: string): boolean {
  return RESERVED_PAGE_SLUGS.includes(slug.toLowerCase())
}
