// MY CS MTP — /pricing
// Server component. Lists every active Course → Plan with subject count + starting (lowest) offer price.
// JSON-LD: ItemList of Product items with Offer (price in INR).
import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { formatCurrency } from '@/lib/utils-extra'
import { publicUrl } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ArrowRight, Sparkles, Users } from 'lucide-react'
import { PublicBreadcrumbs } from '@/components/public/breadcrumbs'
import { JsonLd, breadcrumbJsonLd, siteBaseUrl, absUrl } from '@/components/public/seo'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'CS Test Series Pricing & Plans for CSEET, Executive, Professional',
  description:
    'Browse all CS test series plans for CSEET, CS Executive and CS Professional. Pick only the subjects you need. Pay only for what you select. Secure payments.',
  keywords: [
    'CS test series pricing',
    'CSEET test series price',
    'CS Executive test series price',
    'CS Professional test series price',
    'company secretary mock test cost',
    'MY CS MTP plans',
  ],
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'CS Test Series Pricing & Plans for CSEET, Executive, Professional',
    description:
      'Browse all CS test series plans for CSEET, CS Executive and CS Professional. Pick only the subjects you need.',
    url: '/pricing',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MY CS MTP' }],
  },
}

interface PlanRow {
  planId: string
  planName: string
  planSlug: string
  description: string | null
  courseId: string
  courseName: string
  courseSlug: string
  courseImageKey: string | null
  courseImageAlt: string | null
  subjectCount: number
  startingPrice: number
  originalPrice: number
  tags: string | null
}

async function getData(): Promise<PlanRow[]> {
  const courses = await db.course.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      plans: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          planSubjects: {
            where: { isActive: true },
            select: { offerPrice: true, originalPrice: true },
          },
        },
      },
    },
  })
  const rows: PlanRow[] = []
  for (const c of courses) {
    for (const p of c.plans) {
      if (p.planSubjects.length === 0) continue
      let lowest = p.planSubjects[0].offerPrice
      let highestOriginal = p.planSubjects[0].originalPrice
      for (const ps of p.planSubjects) {
        if (ps.offerPrice < lowest) lowest = ps.offerPrice
        if (ps.originalPrice > highestOriginal) highestOriginal = ps.originalPrice
      }
      rows.push({
        planId: p.id,
        planName: p.name,
        planSlug: p.slug,
        description: p.description,
        courseId: c.id,
        courseName: c.name,
        courseSlug: c.slug,
        courseImageKey: c.imageKey,
        courseImageAlt: c.imageAlt,
        subjectCount: p.planSubjects.length,
        startingPrice: lowest,
        originalPrice: highestOriginal,
        tags: p.tags,
      })
    }
  }
  return rows
}

export default async function PricingPage() {
  const [settings, plans] = await Promise.all([getSettings(), getData()])

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Pricing' },
  ]

  const itemList = plans.map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Product',
      name: `${p.planName} — ${p.courseName}`,
      description: p.description || `Mock test series for ${p.courseName}.`,
      url: absUrl(`/plan/${p.planSlug}`),
      brand: { '@type': 'Brand', name: settings.siteName },
      category: 'CS Test Series',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: String(p.startingPrice),
        availability: 'https://schema.org/InStock',
        url: absUrl(`/plan/${p.planSlug}`),
      },
    },
  }))
  const jsonLd = [breadcrumbJsonLd(crumbs), { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: itemList }]

  return (
    <>
      <PublicBreadcrumbs items={crumbs} />

      <section className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">CS Test Series Pricing & Plans</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Every CS plan on MY CS MTP — for CSEET, CS Executive and CS Professional. Inside each plan, pick only the subjects you need and pay only for what you select. No hidden charges.
          </p>
        </div>

        {plans.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No plans are available right now. Please check back soon or{' '}
            <Link href="/contact" className="text-foreground hover:underline">contact us</Link>.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p) => {
              const tagList = p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
              return (
                <Card key={p.planId} className="flex flex-col">
                  <CardContent className="pt-6 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Badge variant="secondary">{p.courseName}</Badge>
                      {p.startingPrice < p.originalPrice && (
                        <Badge variant="outline" className="gap-1">
                          <Sparkles className="h-3 w-3" /> Offer
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold leading-tight">{p.planName}</h2>
                    {p.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.description}</p>
                    )}

                    <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{p.subjectCount} subject{p.subjectCount === 1 ? '' : 's'}</span>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs text-muted-foreground">Starting from</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{formatCurrency(p.startingPrice, settings.currencySymbol)}</span>
                        {p.originalPrice > p.startingPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatCurrency(p.originalPrice, settings.currencySymbol)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">per subject · all-inclusive</div>
                    </div>

                    {tagList.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-4">
                        {tagList.slice(0, 4).map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    )}

                    <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                      <li className="inline-flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> Hand-evaluated answer sheets</li>
                      <li className="inline-flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> Instant access on payment</li>
                      <li className="inline-flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> Performance charts in dashboard</li>
                    </ul>

                    <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-1">
                      <Button asChild size="sm" className="flex-1">
                        <Link href={`/plan/${p.planSlug}`}>View details</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/course/${p.courseSlug}`}>Course page</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Custom-plan CTA */}
        <div className="mt-12 border rounded-xl bg-muted/30 p-6 sm:p-10 text-center">
          <h2 className="text-xl sm:text-2xl font-bold">Need a custom plan?</h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            If you want a bundle that isn&apos;t listed — for example, all CS Executive subjects plus a few CS Professional electives — talk to us. We can build a custom package to fit your preparation plan.
          </p>
          <Button asChild className="mt-5">
            <Link href="/contact">
              Contact us for a custom plan <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </section>

      <JsonLd data={jsonLd} />
    </>
  )
}
