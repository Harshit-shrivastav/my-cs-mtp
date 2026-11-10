// MY CS MTP — /[slug]
// Catch-all for custom pages defined by the admin via CustomPage model.
// More specific routes (/blog, /pricing, /course/[slug], /plan/[slug], etc.) win in Next.js routing.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { publicUrl } from '@/lib/storage'
import { PublicBreadcrumbs } from '@/components/public/breadcrumbs'
import { JsonLd, breadcrumbJsonLd, absUrl } from '@/components/public/seo'
import { ContactLeadFormClient } from '@/components/public/contact-lead-form'

export const revalidate = 60

// Reserved slugs that should never match a CustomPage — they are owned by specific routes.
const RESERVED = new Set([
  'blog', 'pricing', 'cs-test-series', 'cseet-test-series',
  'cs-executive-test-series', 'cs-professional-test-series',
  'cs-test-series-review', 'cstestseriesschedule',
  'course', 'plan', 'cart', 'dashboard', 'admin', 'examiner',
  'login', 'signup', 'verify', 'forgot-password', 'reset-password',
  'payment-success', 'payment-failed', 'payment',
  'api', '_next', 'favicon.svg', 'favicon.ico', 'logo.svg',
  'robots.txt', 'manifest.webmanifest', 'uploads',
])

interface Params { params: Promise<{ slug: string }> }

async function getPage(slug: string) {
  return db.customPage.findUnique({ where: { slug } })
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const page = await db.customPage.findUnique({ where: { slug } })
  if (!page || !page.isActive) return { title: 'Page not found' }
  const title = page.seoTitle || `${page.title}`
  const description = page.seoDescription || page.content.slice(0, 155)
  const imageUrl = page.ogImageKey ? `/api/storage/download?key=${encodeURIComponent(page.ogImageKey)}` : '/og-default.png'
  return {
    title,
    description,
    keywords: page.seoKeywords ? page.seoKeywords.split(',').map((s) => s.trim()) : undefined,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title,
      description,
      url: `/${page.slug}`,
      type: 'article',
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
  }
}

export default async function CustomPageSlug({ params }: Params) {
  const { slug } = await params
  // Defensive: never serve a reserved slug from this catch-all
  if (RESERVED.has(slug)) notFound()
  const page = await getPage(slug)
  if (!page || !page.isActive) notFound()

  const settings = await getSettings()
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: page.title },
  ]

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.seoDescription || page.content.slice(0, 155),
    datePublished: page.createdAt.toISOString(),
    dateModified: page.updatedAt.toISOString(),
    author: { '@type': 'Organization', name: settings.siteName },
    publisher: {
      '@type': 'Organization',
      name: settings.siteName,
      logo: { '@type': 'ImageObject', url: absUrl('/logo.svg') },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absUrl(`/${page.slug}`) },
  }

  const ogImage = page.ogImageKey ? publicUrl(page.ogImageKey) : null

  return (
    <>
      <PublicBreadcrumbs items={crumbs} />

      <article className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{page.title}</h1>

        {ogImage && (
          <img src={ogImage} alt={page.title} className="mt-6 rounded-lg border w-full max-h-80 object-cover" />
        )}

        <div className="prose prose-sm sm:prose-base max-w-none mt-6 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-relaxed [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-foreground [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto">
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
            }}
          >
            {page.content}
          </ReactMarkdown>
        </div>

        {/* Lead capture CTA for contact-style pages */}
        {page.slug === 'contact' && (
          <Card className="mt-10">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-2">Send us a message</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Fill in the form and our team will get back to you within one working day. (Or use the WhatsApp button at the bottom-right of the page.)
              </p>
              <ContactLeadFormClient />
            </CardContent>
          </Card>
        )}
      </article>

      <JsonLd data={[breadcrumbJsonLd(crumbs), articleLd]} />
    </>
  )
}
