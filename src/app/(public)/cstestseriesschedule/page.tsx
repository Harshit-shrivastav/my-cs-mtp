// MY CS MTP — /cstestseriesschedule
// Server component. Public test schedules listing with optional course filter.
import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Calendar } from 'lucide-react'
import { PublicBreadcrumbs } from '@/components/public/breadcrumbs'
import { JsonLd, breadcrumbJsonLd } from '@/components/public/seo'
import { ScheduleFilterClient } from '@/components/public/schedule-filter'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'CS Test Series Schedule 2026 — Exam Dates',
  description:
    'Download the latest test series schedules for CSEET, CS Executive and CS Professional. Plan your preparation with our published test calendar.',
  keywords: [
    'cs test series schedule',
    'cseet test schedule',
    'cs executive test schedule',
    'cs professional test schedule',
    'my cs mtp schedule',
  ],
  alternates: { canonical: '/cstestseriesschedule' },
  openGraph: {
    title: 'CS Test Series Schedule 2026 — Exam Dates',
    description: 'Download the latest test series schedules for CSEET, CS Executive and CS Professional.',
    url: '/cstestseriesschedule',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MY CS MTP' }],
  },
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const sp = await searchParams
  const courseFilter = sp.course && sp.course !== 'all' ? sp.course : null

  const [courses, schedules] = await Promise.all([
    db.course.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, slug: true } }),
    db.schedule.findMany({
      where: {
        isPublic: true,
        ...(courseFilter ? { course: { slug: courseFilter } } : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        course: { select: { id: true, name: true, slug: true } },
        plan: { select: { id: true, name: true, slug: true } },
      },
    }),
  ])

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Schedules' },
  ]

  // Group schedules by course → plan
  const grouped: Record<string, { courseName: string; courseSlug: string; plans: Record<string, { planName: string; planSlug: string; items: typeof schedules }[]> }> = {}
  for (const s of schedules) {
    const ck = s.course.slug
    if (!grouped[ck]) grouped[ck] = { courseName: s.course.name, courseSlug: s.course.slug, plans: [] }
    let planBucket = grouped[ck].plans.find((p) => p.planSlug === s.plan.slug)
    if (!planBucket) {
      planBucket = { planName: s.plan.name, planSlug: s.plan.slug, items: [] }
      grouped[ck].plans.push(planBucket)
    }
    planBucket.items.push(s)
  }

  return (
    <>
      <PublicBreadcrumbs items={crumbs} />

      <section className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">CS Test Series Schedule 2026</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Download the latest published test schedules for every CS course. Filter by course to see only the sittings relevant to you.
          </p>
        </div>

        {/* Filter client island */}
        <ScheduleFilterClient courses={courses} current={courseFilter || 'all'} />

        {/* Grouped list */}
        {schedules.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="pt-10 pb-10 text-center">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No public schedules match this filter.</p>
              <p className="text-sm text-muted-foreground mt-1">Purchased-plan schedules are available in your dashboard after checkout.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/pricing">Browse plans</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 space-y-8">
            {Object.values(grouped).map((grp) => (
              <div key={grp.courseSlug}>
                <h2 className="text-xl font-bold mb-3">{grp.courseName}</h2>
                <div className="space-y-4">
                  {grp.plans.map((p) => (
                    <Card key={p.planSlug}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <Link href={`/plan/${p.planSlug}`} className="font-medium hover:underline">{p.planName}</Link>
                          <Badge variant="secondary">{p.items.length} schedule{p.items.length === 1 ? '' : 's'}</Badge>
                        </div>
                        <ul className="divide-y">
                          {p.items.map((s) => (
                            <li key={s.id} className="py-3 flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium text-sm">{s.title}</div>
                                {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                                {s.publishedAt && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Published {new Date(s.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                )}
                              </div>
                              {s.fileKey ? (
                                <a
                                  href={`/api/storage/download?key=${encodeURIComponent(s.fileKey)}`}
                                  target="_blank"
                                  rel="noopener"
                                  className="text-xs inline-flex items-center gap-1 hover:underline shrink-0"
                                >
                                  <Download className="h-3.5 w-3.5" /> Download
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground shrink-0">No file</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  )
}
