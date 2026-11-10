// MY CS MTP — /course/[slug]
// Server component. Course detail page.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { formatCurrency } from '@/lib/utils-extra'
import { publicUrl } from '@/lib/storage'
import { BuyingWidget, type BuyingPlan } from '@/components/public/buying-widget'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ArrowRight, BookOpen, FileText, Calendar, Users } from 'lucide-react'
import { PublicBreadcrumbs } from '@/components/public/breadcrumbs'
import { JsonLd, breadcrumbJsonLd, absUrl } from '@/components/public/seo'

export const revalidate = 60

const GENERIC_FAQS = [
  { q: 'How do I get the question paper after purchase?', a: 'Go to your dashboard → Test Series → open the paper → click "Download question paper". Access is granted instantly after payment verification.' },
  { q: 'How do I submit my answer sheet?', a: 'After writing by hand, scan your answer sheet and upload it from the paper page in your dashboard. We accept PDF, JPG and PNG up to 50 MB.' },
  { q: 'How long does evaluation take?', a: 'Typically 5–7 working days. You will get an email and an in-app notification once your evaluated copy is ready.' },
  { q: 'Can I buy only a few subjects inside this course?', a: 'Yes. Inside each plan you can pick only the subjects you want, and pay only for what you selected.' },
  { q: 'Is my payment secure?', a: 'Yes. We never store card details. Payments go through Razorpay or Cashfree, and we verify the payment signature on the server before granting access.' },
  { q: 'What if I am not satisfied?', a: 'You can request a callback via the Contact page. See our Refund Policy for the full terms.' },
]

interface Params { params: Promise<{ slug: string }> }

async function getCourse(slug: string) {
  return db.course.findUnique({
    where: { slug },
    include: {
      plans: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          planSubjects: {
            where: { isActive: true },
            include: { subject: true },
          },
          papers: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: { id: true, title: true },
          },
          schedules: {
            where: { isPublic: true },
            orderBy: { publishedAt: 'desc' },
            select: { id: true, title: true, fileKey: true, isPublic: true },
          },
        },
      },
      subjects: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, slug: true, description: true },
      },
    },
  })
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const course = await db.course.findUnique({ where: { slug } })
  if (!course || !course.isActive) return { title: 'Course not found' }
  const title = course.seoTitle || `${course.name} Test Series 2026`
  const description = course.seoDescription || course.description
  return {
    title,
    description,
    keywords: course.seoKeywords ? course.seoKeywords.split(',').map((s) => s.trim()) : undefined,
    alternates: { canonical: `/course/${course.slug}` },
    openGraph: {
      title,
      description,
      url: `/course/${course.slug}`,
      type: 'website',
      ...(course.ogImageKey
        ? { images: [{ url: `/api/storage/download?key=${encodeURIComponent(course.ogImageKey)}` }] }
        : course.imageKey
          ? { images: [{ url: `/api/storage/download?key=${encodeURIComponent(course.imageKey)}` }] }
          : { images: [{ url: '/og-default.png', width: 1200, height: 630, alt: course.name }] }),
    },
  }
}

export default async function CoursePage({ params }: Params) {
  const { slug } = await params
  const course = await getCourse(slug)
  if (!course || !course.isActive) notFound()

  const [settings, relatedCourses, latestBlog] = await Promise.all([
    getSettings(),
    db.course.findMany({
      where: { isActive: true, slug: { not: course.slug } },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, description: true },
      take: 4,
    }),
    db.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { id: true, title: true, slug: true, excerpt: true, publishedAt: true },
    }),
  ])

  // Build BuyingPlans for each plan in the course
  const buyingPlans: BuyingPlan[] = course.plans
    .filter((p) => p.planSubjects.length > 0)
    .map((p) => ({
      planId: p.id,
      planName: p.name,
      planSlug: p.slug,
      courseName: course.name,
      courseSlug: course.slug,
      subjects: p.planSubjects.map((ps) => ({
        planSubjectId: ps.id,
        subjectId: ps.subjectId,
        subjectName: ps.subject.name,
        originalPrice: ps.originalPrice,
        offerPrice: ps.offerPrice,
      })),
    }))

  const totalPapers = course.plans.reduce((s, p) => s + p.papers.length, 0)
  const totalSchedules = course.plans.reduce((s, p) => s + p.schedules.length, 0)

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Courses', href: '/cs-test-series' },
    { name: course.name },
  ]

  const courseLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.name,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: 'MY CS MTP',
      sameAs: absUrl('/'),
    },
    hasCourseInstance: buyingPlans.map((p) => ({
      '@type': 'CourseInstance',
      courseMode: 'online',
      name: p.planName,
    })),
    offers: buyingPlans.map((p) => {
      const lowest = p.subjects.reduce((m, s) => Math.min(m, s.offerPrice), Infinity)
      return {
        '@type': 'Offer',
        name: p.planName,
        priceCurrency: 'INR',
        price: String(Number.isFinite(lowest) ? lowest : 0),
        availability: 'https://schema.org/InStock',
        url: absUrl(`/plan/${p.planSlug}`),
      }
    }),
  }

  const imageUrl = course.imageKey ? publicUrl(course.imageKey) : null

  return (
    <>
      <PublicBreadcrumbs items={crumbs} />

      <section className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Badge variant="secondary" className="mb-3">{course.name}</Badge>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{course.name} Test Series</h1>
            <p className="mt-4 text-muted-foreground text-lg leading-relaxed">{course.description}</p>

            <div className="grid grid-cols-3 gap-3 mt-6 max-w-md">
              <Card><CardContent className="pt-4 pb-4 text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-foreground" />
                <div className="text-xl font-bold">{buyingPlans.length}</div>
                <div className="text-xs text-muted-foreground">Plans</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <BookOpen className="h-5 w-5 mx-auto mb-1 text-foreground" />
                <div className="text-xl font-bold">{course.subjects.length}</div>
                <div className="text-xs text-muted-foreground">Subjects</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <FileText className="h-5 w-5 mx-auto mb-1 text-foreground" />
                <div className="text-xl font-bold">{totalPapers}</div>
                <div className="text-xs text-muted-foreground">Papers</div>
              </CardContent></Card>
            </div>

            {imageUrl && (
              <img src={imageUrl} alt={course.imageAlt || course.name} className="mt-8 rounded-lg border w-full max-h-80 object-cover" />
            )}

            {totalSchedules > 0 && (
              <div className="mt-8 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Test schedule available</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  This course has {totalSchedules} published test schedule{totalSchedules === 1 ? '' : 's'}. View all schedules to plan your preparation.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href="/cstestseriesschedule">View schedules</Link>
                </Button>
              </div>
            )}
          </div>

          <div>
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h2 className="font-semibold">Quick links</h2>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/pricing">See all pricing</Link>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/cstestseriesschedule">All schedules</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href="#buy">Buy this course</Link>
                </Button>
                <p className="text-xs text-muted-foreground pt-2">
                  Need a custom plan? <Link href="/contact" className="text-foreground hover:underline">Contact us</Link>.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* SUBJECTS */}
      <section className="border-t bg-muted/20">
        <div className="container mx-auto px-4 py-10 max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Subjects in {course.name}</h2>
          <p className="text-muted-foreground mb-6">All {course.subjects.length} subjects covered in this course&apos;s plans.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {course.subjects.map((s) => (
              <Card key={s.id}>
                <CardContent className="pt-6">
                  <BookOpen className="h-5 w-5 mb-2 text-foreground" />
                  <h3 className="font-medium">{s.name}</h3>
                  {s.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{s.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section id="buy" className="container mx-auto px-4 py-12 max-w-6xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Plans for {course.name}</h2>
        <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
          Choose the subjects you want inside each plan. See a live total before you add to cart.
        </p>
        {buyingPlans.length === 0 ? (
          <p className="text-center text-muted-foreground">No plans available right now. Please check back soon.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {buyingPlans.map((p) => (
              <BuyingWidget key={p.planId} plan={p} />
            ))}
          </div>
        )}
      </section>

      {/* PLAN LINKS */}
      <section className="border-t bg-muted/20">
        <div className="container mx-auto px-4 py-10 max-w-6xl">
          <h2 className="text-2xl font-bold mb-4">All plans in this course</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {course.plans.map((p) => {
              const lowest = p.planSubjects.length > 0
                ? p.planSubjects.reduce((m, ps) => Math.min(m, ps.offerPrice), Infinity)
                : null
              const highestOriginal = p.planSubjects.length > 0
                ? p.planSubjects.reduce((m, ps) => Math.max(m, ps.originalPrice), 0)
                : null
              return (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <Link href={`/plan/${p.slug}`}>
                    <CardContent className="pt-6">
                      <Badge variant="secondary" className="mb-2">{course.name}</Badge>
                      <h3 className="font-semibold">{p.name}</h3>
                      {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                      <div className="mt-3 text-sm text-muted-foreground">
                        {p.planSubjects.length} subject{p.planSubjects.length === 1 ? '' : 's'}
                      </div>
                      {lowest !== null && Number.isFinite(lowest) && (
                        <div className="mt-1">
                          <span className="text-xs text-muted-foreground">From </span>
                          <span className="font-semibold">{formatCurrency(lowest, settings.currencySymbol)}</span>
                          {highestOriginal && highestOriginal > lowest && (
                            <span className="text-xs text-muted-foreground line-through ml-2">
                              {formatCurrency(highestOriginal, settings.currencySymbol)}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-foreground mt-3 inline-flex items-center gap-1">
                        View plan details <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-12 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Frequently asked questions</h2>
        <Accordion type="single" collapsible>
          {GENERIC_FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* RELATED */}
      <section className="border-t bg-muted/20">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <h2 className="text-2xl font-bold mb-4">Related courses</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {relatedCourses.map((c) => (
              <Card key={c.id}>
                <Link href={`/course/${c.slug}`}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>

          {latestBlog.length > 0 && (
            <>
              <h2 className="text-2xl font-bold mb-4 mt-10">From the blog</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {latestBlog.map((b) => (
                  <Card key={b.id}>
                    <Link href={`/blog/${b.slug}`}>
                      <CardContent className="pt-6">
                        <div className="text-xs text-muted-foreground mb-1">
                          {b.publishedAt && new Date(b.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <h3 className="font-semibold text-sm line-clamp-2">{b.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{b.excerpt}</p>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <JsonLd data={[breadcrumbJsonLd(crumbs), courseLd]} />
    </>
  )
}
