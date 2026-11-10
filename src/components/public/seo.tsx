// MY CS MTP — small shared helpers for public SEO pages.

export function siteBaseUrl(): string {
  return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export function absUrl(path: string): string {
  if (!path) return siteBaseUrl()
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = siteBaseUrl()
  return `${base}${path.startsWith('/') ? path : '/' + path}`
}

/** Renders a `<script type="application/ld+json">` block. Safe because input is JSON.stringify-ed. */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export type Crumb = { name: string; href?: string }

/** Standard breadcrumb structured-data object (schema.org/BreadcrumbList). */
export function breadcrumbJsonLd(crumbs: Crumb[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: absUrl(c.href) } : {}),
    })),
  }
}

/** Standard organization structured-data object. */
export function organizationJsonLd(opts: {
  name: string
  email?: string
  telephone?: string
  address?: string
  logoUrl?: string
  social?: string[]
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: opts.name,
    url: siteBaseUrl(),
    ...(opts.logoUrl ? { logo: opts.logoUrl } : {}),
    ...(opts.email ? { email: opts.email } : {}),
    ...(opts.telephone ? { telephone: opts.telephone } : {}),
    ...(opts.address ? { address: opts.address } : {}),
    ...(opts.social && opts.social.length ? { sameAs: opts.social } : {}),
  }
}

/** Standard FAQPage structured-data object. */
export function faqJsonLd(faqs: { q: string; a: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}
