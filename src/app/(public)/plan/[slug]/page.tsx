// MY CS MTP — /plan/[slug]
// Server component. Plan detail page.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { formatCurrency } from '@/lib/utils-extra'
import { BuyingWidget, type BuyingPlan } from '@/components/public/buying-widget'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Calendar, Download, FileText, BookOpen } from 'lucide-react'
import { PublicBreadcrumbs } from '@/components/public/breadcrumbs'
import { JsonLd, breadcrumbJsonLd, absUrl } from '@/components/public/seo'

export const revalidate = 60

interface Params { params: Promise<{ slug: string }> }

async function getPlan(slug: string) {
  return db.plan.findUnique({
    where: { slug },
    include: {
      course: true,
      planSubjects: {
        where: { isActive: true },
        include: {
          subject: true,
          papers: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: { id: true, title: true, totalMarks: true, scheduledDate: true },
          },
        },
      },
      schedules: {
        where: { isPublic: true },
        orderBy: { publishedAt: 'desc' },
        select: { id: true, title: true, fileKey: true, isPublic: true },
      },
      scheduleNames: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } },
    },
  })
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const plan = await db.plan.findUnique({
    where: { slug },
    include: { course: true },
  })
  if (!plan || !plan.isActive || !plan.course.isActive) return { title: 'Plan not found' }
  const title = plan.seoTitle || `${plan.name} — ${plan.course.name} Test Series`
  const description = plan.seoDescription || plan.description || `${plan.name} — chapterwise and full mock tests with hand evaluation.`
  return {
    title,
    description,
    keywords: plan.seoKeywords ? plan.seoKeywords.split(',').map((s) => s.trim()) : undefined,
    alternates: { canonical: `/plan/${plan.slug}` },
    openGraph: {
      title,
      description,
      url: `/plan/${plan.slug}`,
      type: 'website',
      ...(plan.ogImageKey
        ? { images: [{ url: `/api/storage/download?key=${encodeURIComponent(plan.ogImageKey)}` }] }
        : { images: [{ url: '/og-default.png', width: 1200, height: 630, alt: plan.name }] }),
    },
  }
}

export default async function PlanPage({ params }: Params) {
  const { slug } = await params
  const plan = await getPlan(slug)
  if (!plan || !plan.isActive || !plan.course.isActive) notFound()

  const settings = await getSettings()

  const buyingPlan: BuyingPlan = {
    planId: plan.id,
    planName: plan.name,
    planSlug: plan.slug,
    courseName: plan.course.name,
    courseSlug: plan.course.slug,
    subjects: plan.planSubjects.map((ps) => ({
      planSubjectId: ps.id,
      subjectId: ps.subjectId,
      subjectName: ps.subject.name,
      originalPrice: ps.originalPrice,
      offerPrice: ps.offerPrice,
    })),
  }

  const lowest = plan.planSubjects.length > 0
    ? plan.planSubjects.reduce((m, ps) => Math.min(m, ps.offerPrice), Infinity)
    : 0

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: plan.course.name, href: `/course/${plan.course.slug}` },
    { name: plan.name },
  ]

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${plan.name} — ${plan.course.name}`,
    description: plan.description || `${plan.name} mock test series.`,
    url: absUrl(`/plan/${plan.slug}`),
    brand: { '@type': 'Brand', name: 'MY CS MTP' },
    category: 'CS Test Series',
    offers: plan.planSubjects.map((ps) => ({
      '@type': 'Offer',
      name: `${plan.name} — ${ps.subject.name}`,
      priceCurrency: 'INR',
      price: String(ps.offerPrice),
      availability: 'https://schema.org/InStock',
      url: absUrl(`/plan/${plan.slug}`),
    })),
  }

  return (
    <>
      <PublicBreadcrumbs items={crumbs} />

      <section className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary">{plan.course.name}</Badge>
              {plan.tags && plan.tags.split(',').slice(0, 3).map((t, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{t.trim()}</Badge>
              ))}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{plan.name}</h1>
            {plan.description && <p className="mt-4 text-muted-foreground text-lg leading-relaxed">{plan.description}</p>}

            <div className="mt-6">
              <div className="text-xs text-muted-foreground">Starting from</div>
              <div className="text-3xl font-bold">
                {formatCurrency(lowest, settings.currencySymbol)}
                <span className="text-sm font-normal text-muted-foreground ml-1">/ subject</span>
              </div>
            </div>

            {/* Schedule download */}
            {plan.scheduleFileKey && (
              <div className="mt-8 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Test schedule</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Download the published test schedule for this plan.</p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <a href={`/api/storage/download?key=${encodeURIComponent(plan.scheduleFileKey)}`} target="_blank" rel="noopener">
                    <Download className="h-4 w-4 mr-1.5" /> Download schedule
                  </a>
                </Button>
              </div>
            )}

            {/* Public schedules list */}
            {plan.schedules.length > 0 && (
              <div className="mt-6 border rounded-lg p-4">
                <h3 className="font-medium mb-2">Published schedules</h3>
                <ul className="space-y-2 text-sm">
                  {plan.schedules.map((s) => (
                    <li key={s.id} className="flex items-center justify-between">
                      <span className="text-foreground">{s.title}</span>
                      {s.fileKey ? (
                        <a
                          href={`/api/storage/download?key=${encodeURIComponent(s.fileKey)}`}
                          target="_blank"
                          rel="noopener"
                          className="text-xs text-foreground hover:underline inline-flex items-center gap-1"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">View on schedules page</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Subjects list with prices */}
            <h2 className="text-xl font-bold mt-10 mb-3">Subjects in this plan</h2>
            <div className="border rounded-lg divide-y">
              {plan.planSubjects.length === 0 ? (
                <div className="p-4 text-muted-foreground text-sm">No subjects are linked to this plan yet.</div>
              ) : plan.planSubjects.map((ps) => (
                <div key={ps.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium">{ps.subject.name}</h3>
                      </div>
                      {ps.subject.description && (
                        <p className="text-sm text-muted-foreground mt-1">{ps.subject.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-sm">
                        <span className="font-semibold">{formatCurrency(ps.offerPrice, settings.currencySymbol)}</span>
                        {ps.originalPrice > ps.offerPrice && (
                          <span className="text-muted-foreground line-through">
                            {formatCurrency(ps.originalPrice, settings.currencySymbol)}
                          </span>
                        )}
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{ps.papers.length} paper{ps.papers.length === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  </div>
                  {ps.papers.length > 0 && (
                    <ul className="mt-3 pl-6 space-y-1 text-xs text-muted-foreground list-disc">
                      {ps.papers.map((p) => (
                        <li key={p.id}>
                          {p.title} · {p.totalMarks} marks
                          {p.scheduledDate && (
                            <span className="text-muted-foreground/70"> · {new Date(p.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Buying widget */}
          <div>
            <div className="lg:sticky lg:top-20">
              <BuyingWidget plan={buyingPlan} />
              <p className="text-xs text-muted-foreground mt-3">
                You will be asked to log in before checkout. Selected subjects are saved so you don&apos;t lose your cart.
              </p>
            </div>
          </div>
        </div>

        {/* Back to course */}
        <div className="mt-12 flex flex-col sm:flex-row gap-3">
          <Button asChild variant="outline">
            <Link href={`/course/${plan.course.slug}`}>
              <ArrowRight className="h-4 w-4 mr-1.5 rotate-180" /> Back to {plan.course.name}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/pricing">See all plans</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/cstestseriesschedule">View all schedules</Link>
          </Button>
        </div>
      </section>

      <JsonLd data={[breadcrumbJsonLd(crumbs), productLd]} />
    </>
  )
}
