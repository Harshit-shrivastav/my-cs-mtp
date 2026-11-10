// MY CS MTP — shared exam-level landing-page renderer.
// Used by /cseet-test-series, /cs-executive-test-series and /cs-professional-test-series.
import Link from 'next/link'
import { db } from '@/lib/db'
import { BuyingWidget, type BuyingPlan } from '@/components/public/buying-widget'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Star, CheckCircle2, ArrowRight } from 'lucide-react'
import { PublicBreadcrumbs, type Crumb } from '@/components/public/breadcrumbs'
import { JsonLd, breadcrumbJsonLd, faqJsonLd, absUrl } from '@/components/public/seo'

export interface ExamLandingContent {
  courseSlug: string
  courseKey: string // CSEET | CS_EXECUTIVE | CS_PROFESSIONAL
  crumbs: Crumb[]
  hero: {
    badge?: string
    title: React.ReactNode
    subtitle: string
    ctaPrimary?: { label: string; href: string }
    ctaSecondary?: { label: string; href: string }
  }
  whatIs: { title: string; paragraphs: string[] }
  pattern: { title: string; intro?: string; rows: { label: string; value: string }[] }
  why: { title: string; intro?: string; features: { title: string; text: string }[] }
  howItWorks?: { title: string; steps: { title: string; text: string }[] }
  testimonials: { name: string; course: string; text: string; rating: number }[]
  faqs: { q: string; a: string }[]
}

async function getCourseAndPlans(courseSlug: string): Promise<{ course: Awaited<ReturnType<typeof db.course.findUnique>>; plans: BuyingPlan[] }> {
  const course = await db.course.findUnique({
    where: { slug: courseSlug },
    include: {
      plans: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          planSubjects: {
            where: { isActive: true },
            include: { subject: true },
          },
        },
      },
    },
  })
  if (!course || !course.isActive) return { course: null, plans: [] }
  const plans: BuyingPlan[] = course.plans.filter((p) => p.planSubjects.length > 0).map((p) => ({
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
  return { course, plans }
}

export async function ExamLevelLanding({ content }: { content: ExamLandingContent }) {
  const { course, plans } = await getCourseAndPlans(content.courseSlug)

  const faqLd = faqJsonLd(content.faqs)
  const breadcrumbLd = breadcrumbJsonLd(content.crumbs)

  // Course JSON-LD with Product offers
  const courseLd = course
    ? {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: course.name,
        description: course.description,
        provider: {
          '@type': 'Organization',
          name: 'MY CS MTP',
          sameAs: absUrl('/'),
        },
        hasCourseInstance: plans.map((p) => ({
          '@type': 'CourseInstance',
          courseMode: 'online',
          courseWorkload: 'PT5H',
          name: p.planName,
        })),
        offers: plans.map((p) => {
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
    : null

  return (
    <>
      <PublicBreadcrumbs items={content.crumbs} />

      {/* HERO */}
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-14 lg:py-20 max-w-6xl">
          <div className="max-w-3xl">
            {content.hero.badge && (
              <Badge variant="outline" className="mb-4 inline-flex items-center gap-1.5 py-1.5">
                <Star className="h-3.5 w-3.5 fill-foreground text-foreground" /> {content.hero.badge}
              </Badge>
            )}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
              {content.hero.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">{content.hero.subtitle}</p>
            {(content.hero.ctaPrimary || content.hero.ctaSecondary) && (
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                {content.hero.ctaPrimary && (
                  <Button asChild size="lg">
                    <Link href={content.hero.ctaPrimary.href}>{content.hero.ctaPrimary.label}</Link>
                  </Button>
                )}
                {content.hero.ctaSecondary && (
                  <Button asChild size="lg" variant="outline">
                    <Link href={content.hero.ctaSecondary.href}>{content.hero.ctaSecondary.label}</Link>
                  </Button>
                )}
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Hand-evaluated copies</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> 5–7 day turnaround</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Updated to 2026 syllabus</span>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS */}
      <section className="container mx-auto px-4 py-10 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">{content.whatIs.title}</h2>
        {content.whatIs.paragraphs.map((p, i) => (
          <p key={i} className="text-muted-foreground leading-relaxed mt-4 first:mt-0">{p}</p>
        ))}
      </section>

      {/* PATTERN */}
      <section className="border-t bg-muted/20">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">{content.pattern.title}</h2>
          {content.pattern.intro && <p className="text-muted-foreground mb-6 max-w-3xl">{content.pattern.intro}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            {content.pattern.rows.map((r, i) => (
              <Card key={i}>
                <CardContent className="py-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{r.label}</div>
                    <div className="text-sm font-medium">{r.value}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="container mx-auto px-4 py-12 max-w-6xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">{content.why.title}</h2>
        {content.why.intro && <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">{content.why.intro}</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {content.why.features.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      {content.howItWorks && (
        <section className="border-y bg-muted/20">
          <div className="container mx-auto px-4 py-12 max-w-6xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">{content.howItWorks.title}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {content.howItWorks.steps.map((s, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground mb-1">Step {i + 1}</div>
                    <h3 className="font-semibold mb-1">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PLANS */}
      <section id="buy" className="container mx-auto px-4 py-12 max-w-6xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Plans for {course?.name || content.courseSlug}</h2>
        <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
          Choose the subjects you want inside each plan. See a live total before you add to cart.
        </p>
        {!course ? (
          <p className="text-center text-muted-foreground">No course found. Please check back soon.</p>
        ) : plans.length === 0 ? (
          <p className="text-center text-muted-foreground">No plans available right now. Please check back soon.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => (
              <BuyingWidget key={p.planId} plan={p} />
            ))}
          </div>
        )}
        {course && (
          <div className="text-center mt-8">
            <Button asChild variant="outline">
              <Link href={`/course/${course.slug}`}>View course details <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
            </Button>
          </div>
        )}
      </section>

      {/* TESTIMONIALS */}
      <section className="border-t bg-muted/20">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">What students say</h2>
              <p className="text-muted-foreground mt-1">Real reviews from students who used MY CS MTP.</p>
            </div>
            <Link href="/cs-test-series-review" className="text-sm text-foreground hover:underline inline-flex items-center gap-1">
              Read all reviews <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.testimonials.map((t) => (
              <Card key={t.name}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-0.5 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < t.rating ? 'fill-foreground text-foreground' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground italic mb-3">&quot;{t.text}&quot;</p>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.course}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-12 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Frequently asked questions</h2>
        <Accordion type="single" collapsible>
          {content.faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Ready to start your {course?.name || 'CS'} prep?</h2>
          <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
            Get instant access to chapterwise and full mock tests, hand-evaluated by experienced checkers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link href="/pricing">Browse plans</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link href="/signup">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>

      <JsonLd data={courseLd ? [breadcrumbLd, faqLd, courseLd] : [breadcrumbLd, faqLd]} />
    </>
  )
}
