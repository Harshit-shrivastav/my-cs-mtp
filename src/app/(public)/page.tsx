import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { BuyingWidget, BuyingPlan } from '@/components/public/buying-widget'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils-extra'
import { CheckCircle2, Clock, Download, FileText, PenLine, Award, Users, Star, GraduationCap, ShieldCheck, MessageSquare, Target, BookOpen, ArrowRight, ShoppingCart } from 'lucide-react'

export const revalidate = 60

const STATS = [
  { label: 'Mock tests attempted', value: '15,000+', icon: FileText },
  { label: 'Students enrolled', value: '3,200+', icon: Users },
  { label: 'Avg. evaluation time', value: '5–7 days', icon: Clock },
  { label: 'Pass-rate improvement', value: '40%', icon: Award },
]

const STEPS = [
  { icon: ShoppingCart, title: 'Buy a plan', text: 'Pick the subjects you want, see a live total, and check out securely.' },
  { icon: Download, title: 'Download question paper', text: 'Get the question paper instantly after purchase.' },
  { icon: PenLine, title: 'Write & upload your answer sheet', text: 'Attempt the test by hand, scan and upload your answer sheet.' },
  { icon: Award, title: 'Get evaluated copy + marks', text: 'A human examiner evaluates your copy, gives marks and uploads the checked file.' },
]

const FEATURES = [
  { icon: GraduationCap, title: 'Built only for CS', text: 'CSEET, Executive and Professional — nothing else. Every paper is written and checked by people who cleared CS themselves.' },
  { icon: PenLine, title: 'Human evaluation', text: 'No automated grading. A real examiner reads your answers, gives marks and writes remarks.' },
  { icon: Clock, title: 'Fast turnaround', text: 'Evaluation promise: typically 5–7 working days. Track every submission in your dashboard.' },
  { icon: ShieldCheck, title: 'Secure payments', text: 'Pay via Razorpay or Cashfree. Pay only after the server verifies the payment signature.' },
  { icon: Target, title: 'Performance charts', text: 'Marks per paper, per subject, percentage trends — track your improvement visually.' },
  { icon: MessageSquare, title: 'Mentorship by AIRs', text: 'Book a session with All India Rankers. Clear your doubts and strategy blocks.' },
]

const FAQS = [
  { q: 'How do I get the question paper after purchase?', a: 'Go to your dashboard → Test Series → open the paper → click "Download question paper". Access is granted instantly after payment verification.' },
  { q: 'How do I submit my answer sheet?', a: 'After writing by hand, scan your answer sheet and upload it from the paper page in your dashboard. We accept PDF, JPG and PNG up to 50 MB.' },
  { q: 'How long does evaluation take?', a: 'Typically 5–7 working days. You will get an email and an in-app notification once your evaluated copy is ready.' },
  { q: 'Can I buy only a few subjects?', a: 'Yes. Inside each plan you can pick only the subjects you need, and pay only for what you selected.' },
  { q: 'Is my payment secure?', a: 'Yes. We never store card details. Payments go through Razorpay or Cashfree, and we verify the payment signature on the server before granting access.' },
  { q: 'What if I am not satisfied?', a: 'You can request a callback via the Contact page. See our Refund Policy for the full terms.' },
]

const TESTIMONIALS = [
  { name: 'Ananya R.', course: 'CSEET — May 2025', text: 'I cleared CSEET in my first attempt. The unitwise mocks covered every important topic and the evaluation feedback told me exactly where I was losing marks.', rating: 5 },
  { name: 'Rohan S.', course: 'CS Executive — June 2025', text: 'The chapterwise plan let me prepare one subject at a time. Hand evaluation was a game-changer — much better than just getting a score.', rating: 5 },
  { name: 'Sneha P.', course: 'CS Professional — June 2025', text: 'Mentorship by AIRs was the best part. My mentor fixed my strategy for the elective paper and I scored 67 in that module.', rating: 5 },
  { name: 'Karan M.', course: 'CSEET — Jan 2025', text: 'Schedules are well-structured. I always knew which test was coming next, so I never had to plan separately.', rating: 4 },
  { name: 'Priya V.', course: 'CS Executive — Dec 2024', text: 'The performance charts helped me see my weak chapters. I improved my Company Law score from 48 to 71.', rating: 5 },
  { name: 'Aditya K.', course: 'CS Professional — Dec 2024', text: 'Notes and amendments on MY CS MTP are accurate and up-to-date. I cleared all three professional modules using only these mocks.', rating: 5 },
]

const MENTORS = [
  { name: 'CS Ankit Verma', rank: 'AIR 12, CS Professional 2019', specialty: 'Company Law, Corporate Governance' },
  { name: 'CS Neha Gupta', rank: 'AIR 7, CS Executive 2018', specialty: 'Securities Laws, Capital Markets' },
  { name: 'CS Rishi Sharma', rank: 'AIR 3, CSEET 2018', specialty: 'Business Communication, Current Affairs' },
]

async function getHomeData() {
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
            include: { subject: true },
          },
        },
      },
      examTiming: true,
    },
  })
  const blog = await db.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 3,
  })
  return { courses, blog }
}

export default async function HomePage() {
  const [settings, data] = await Promise.all([getSettings(), getHomeData()])

  // Countdown to nearest exam
  const now = new Date()
  const upcoming = data.courses
    .map((c) => c.examTiming)
    .filter(Boolean)
    .filter((t) => t!.examDate > now)
    .sort((a, b) => a!.examDate.getTime() - b!.examDate.getTime())[0]
  const daysLeft = upcoming ? Math.max(0, Math.ceil((upcoming.examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null

  // Build BuyingPlans for the first plan of each course
  const buyingPlans: BuyingPlan[] = []
  for (const c of data.courses) {
    for (const p of c.plans) {
      if (p.planSubjects.length === 0) continue
      buyingPlans.push({
        planId: p.id,
        planName: p.name,
        planSlug: p.slug,
        courseName: c.name,
        courseSlug: c.slug,
        subjects: p.planSubjects.map((ps) => ({
          planSubjectId: ps.id,
          subjectId: ps.subjectId,
          subjectName: ps.subject.name,
          originalPrice: ps.originalPrice,
          offerPrice: ps.offerPrice,
        })),
      })
    }
  }

  // JSON-LD structured data
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.siteName,
    url: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
    logo: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '') + '/logo.svg',
    email: settings.supportEmail,
    telephone: settings.supportPhone,
    address: settings.address,
    sameAs: [settings.facebook, settings.instagram, settings.twitter, settings.youtube].filter(Boolean),
  }
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: settings.siteName,
    url: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
    potentialAction: {
      '@type': 'SearchAction',
      target: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '') + '/blog?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      {/* HERO */}
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-16 lg:py-24 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              {daysLeft !== null && upcoming && (
                <Badge variant="outline" className="mb-4 inline-flex items-center gap-1.5 py-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {daysLeft} days to {upcoming.examName}
                </Badge>
              )}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
                CS mock-test series with <span className="text-primary">hand evaluation</span> by AIRs.
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-xl">
                Buy only the subjects you need. Write by hand. Upload your answer sheet. Get marks, remarks and the evaluated copy back — typically in 5–7 working days.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg">
                  <Link href="/cs-test-series">Browse CS test series</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/pricing">See pricing</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Secure payment</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Instant access</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Human evaluation</span>
              </div>
            </div>
            <div className="hidden lg:block">
              <Card className="p-6">
                <h2 className="font-semibold mb-2">How it works</h2>
                <ol className="space-y-3">
                  {STEPS.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <div className="font-medium text-sm">{s.title}</div>
                        <div className="text-xs text-muted-foreground">{s.text}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <Card key={s.label} className="text-center">
              <CardContent className="pt-6">
                <s.icon className="h-6 w-6 mx-auto mb-2 text-foreground" />
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="container mx-auto px-4 py-12 max-w-6xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Why students pick MY CS MTP</h2>
        <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
          We are an independent platform built only for Company Secretary students. We do not split our attention across CA or CMA — and it shows in our evaluation quality.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-6">
                <f.icon className="h-6 w-6 mb-3 text-foreground" />
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS (mobile-visible version) */}
      <section className="border-y bg-muted/20">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">How it works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <s.icon className="h-8 w-8 mb-3 text-foreground" />
                  <div className="text-xs text-muted-foreground mb-1">Step {i + 1}</div>
                  <h3 className="font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container mx-auto px-4 py-12 max-w-6xl">
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
          {TESTIMONIALS.map((t) => (
            <Card key={t.name}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-0.5 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < t.rating ? 'fill-foreground text-foreground' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic mb-3">"{t.text}"</p>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.course}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* BUYING SECTION */}
      <section id="buy" className="border-t bg-muted/20">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Pick your plan and start today</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            Choose the subjects you want inside each plan. See a live total before you add to cart. No hidden charges.
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
        </div>
      </section>

      {/* MENTORS */}
      <section className="container mx-auto px-4 py-12 max-w-6xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Mentored by All India Rankers</h2>
        <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
          Book a one-on-one session with our mentors to fix your strategy, paper-attempt technique or revision plan.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MENTORS.map((m) => (
            <Card key={m.name}>
              <CardContent className="pt-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold mb-3">
                  {m.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </div>
                <h3 className="font-semibold">{m.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">{m.rank}</p>
                <p className="text-sm">Specialises in: <span className="text-muted-foreground">{m.specialty}</span></p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* BLOG */}
      {data.blog.length > 0 && (
        <section className="border-t bg-muted/20">
          <div className="container mx-auto px-4 py-12 max-w-6xl">
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold">From the blog</h2>
              <Link href="/blog" className="text-sm text-foreground hover:underline inline-flex items-center gap-1">
                All posts <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {data.blog.map((b) => (
                <Card key={b.id} className="hover:shadow-md transition-shadow">
                  <Link href={`/blog/${b.slug}`}>
                    <CardContent className="pt-6">
                      <div className="text-xs text-muted-foreground mb-2">{new Date(b.publishedAt!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <h3 className="font-semibold mb-2 line-clamp-2">{b.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">{b.excerpt}</p>
                      {b.tags && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {b.tags.split(',').slice(0, 3).map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">{t.trim()}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="container mx-auto px-4 py-12 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Frequently asked questions</h2>
        <Accordion type="single" collapsible>
          {FAQS.map((f, i) => (
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Ready to start your CS prep?</h2>
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

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  )
}
