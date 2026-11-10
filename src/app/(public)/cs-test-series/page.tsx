// MY CS MTP — /cs-test-series
// The main long-form SEO landing page for "CS test series" in general.
// JSON-LD: FAQPage + BreadcrumbList + Organization.
import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { BuyingWidget, type BuyingPlan } from '@/components/public/buying-widget'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Star, CheckCircle2, GraduationCap, PenLine, Clock, ShieldCheck, Target, MessageSquare, ArrowRight, FileText, Award, Users, DoorOpen, BookOpen } from 'lucide-react'
import { PublicBreadcrumbs } from '@/components/public/breadcrumbs'
import { JsonLd, breadcrumbJsonLd, faqJsonLd, organizationJsonLd, siteBaseUrl } from '@/components/public/seo'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'CS Test Series 2026 — CSEET, Executive & Professional',
  description:
    'CS test series 2026 with hand evaluation by AIRs. CSEET, CS Executive & CS Professional mock tests. Buy only the subjects you need. Evaluated copies in 5–7 days.',
  keywords: [
    'cs test series',
    'cs test series 2026',
    'cseet test series',
    'cs executive test series',
    'cs professional test series',
    'company secretary mock test',
    'icsi mock test',
  ],
  alternates: { canonical: '/cs-test-series' },
  openGraph: {
    title: 'CS Test Series 2026 — CSEET, Executive & Professional',
    description:
      'CS mock test series for CSEET, CS Executive & CS Professional. Hand-evaluated by AIRs. Buy only what you need.',
    url: '/cs-test-series',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MY CS MTP' }],
  },
}

const STATS = [
  { label: 'Mock tests attempted', value: '15,000+', icon: FileText },
  { label: 'Students enrolled', value: '3,200+', icon: Users },
  { label: 'Avg. evaluation time', value: '5–7 days', icon: Clock },
  { label: 'Pass-rate improvement', value: '40%', icon: Award },
]

const STEPS = [
  { icon: FileText, title: 'Buy a plan', text: 'Pick the subjects you want inside each plan. See a live total. Pay securely via Razorpay or Cashfree.' },
  { icon: ArrowRight, title: 'Download question paper', text: 'After payment, the question paper is unlocked instantly in your dashboard. Attempt it under exam conditions.' },
  { icon: PenLine, title: 'Write & upload your answer sheet', text: 'Write by hand. Scan and upload the answer sheet (PDF/JPG/PNG up to 50 MB) from your dashboard.' },
  { icon: Award, title: 'Get marks + evaluated copy', text: 'A human examiner reads, marks and writes remarks on your copy. Typically returned within 5–7 working days.' },
]

const FEATURES = [
  { icon: GraduationCap, title: 'Built only for CS', text: 'CSEET, Executive and Professional — nothing else. Every paper is written and checked by people who cleared CS themselves.' },
  { icon: PenLine, title: 'Human evaluation', text: 'No automated grading. A real examiner reads your answers, gives marks and writes specific remarks on your copy.' },
  { icon: Clock, title: 'Fast turnaround', text: 'Evaluation promise: typically 5–7 working days. Track every submission in your dashboard with live status.' },
  { icon: ShieldCheck, title: 'Secure payments', text: 'Pay via Razorpay or Cashfree. The server verifies the payment signature before granting access.' },
  { icon: Target, title: 'Performance charts', text: 'Marks per paper, per subject, percentage trends — track your improvement visually inside the dashboard.' },
  { icon: MessageSquare, title: 'Mentorship by AIRs', text: 'Book one-on-one sessions with All India Rankers to fix your strategy, paper-attempt technique or revision plan.' },
]

const FAQS = [
  { q: 'What is a CS test series?', a: 'A CS test series is a set of mock tests designed to mimic the real ICSI exam pattern for CSEET, CS Executive and CS Professional. Each paper is timed, written by hand and evaluated by an examiner who gives marks and remarks on your copy.' },
  { q: 'Why should I enrol in a CS test series?', a: 'Mock tests close the gap between reading and recalling. They reveal weak chapters, fix your time management and give you specific, examiner-level feedback. Students who write mocks consistently improve their scores by 30–40% on average.' },
  { q: 'Which exams does MY CS MTP cover?', a: 'We cover all three CS levels — CSEET (4 papers), CS Executive (Module 1 with 3 papers, Module 2 with 3 papers, or Both Modules), and CS Professional (Module 1, Module 2 and a combined plan).' },
  { q: 'Can I buy only a few subjects?', a: 'Yes. Inside each plan you can pick only the subjects you want, and pay only for what you selected. There is no minimum-subject requirement.' },
  { q: 'How long does evaluation take?', a: 'Typically 5–7 working days from the day you upload your answer sheet. You will get an email and an in-app notification once your evaluated copy is ready.' },
  { q: 'Are the test papers based on the latest ICSI syllabus?', a: 'Yes. Every paper is updated to the latest ICSI syllabus and incorporates the latest amendments. Notes and amendment files are available inside your dashboard.' },
  { q: 'How do I download the question paper after purchase?', a: 'Go to your dashboard → Test Series → open the paper → click "Download question paper". Access is granted instantly after payment verification.' },
  { q: 'Is my payment secure?', a: 'Yes. We never store card details. Payments go through Razorpay or Cashfree and we verify the payment signature on the server before granting access to your purchased papers.' },
]

const TESTIMONIALS = [
  { name: 'Ananya R.', course: 'CSEET — May 2025', text: 'I cleared CSEET in my first attempt. The unitwise mocks covered every important topic and the evaluation feedback told me exactly where I was losing marks.', rating: 5 },
  { name: 'Rohan S.', course: 'CS Executive — June 2025', text: 'The chapterwise plan let me prepare one subject at a time. Hand evaluation was a game-changer — much better than just getting a score.', rating: 5 },
  { name: 'Sneha P.', course: 'CS Professional — June 2025', text: 'Mentorship by AIRs was the best part. My mentor fixed my strategy for the elective paper and I scored 67 in that module.', rating: 5 },
  { name: 'Priya V.', course: 'CS Executive — Dec 2024', text: 'The performance charts helped me see my weak chapters. I improved my Company Law score from 48 to 71.', rating: 5 },
]

const JOURNEY = [
  { level: 'CSEET', icon: DoorOpen, desc: 'The entrance gate. 4 papers — Business Communication, Legal Aptitude & Logical Reasoning, Economic & Commercial Environment, Current Affairs. Multiple-choice + viva-voce.' },
  { level: 'CS Executive', icon: BookOpen, desc: 'The professional bridge. Module 1 (3 papers) and Module 2 (3 papers). Company Law, JIGL, Securities Laws, Accounting, EBC Laws — descriptive papers.' },
  { level: 'CS Professional', icon: GraduationCap, desc: 'The final stage. Modules 1, 2 and 3 with electives. Corporate Governance, Restructuring, Dispute Resolution, Drafting — multi-disciplinary descriptive papers.' },
]

async function getBuyingData(): Promise<BuyingPlan[]> {
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
    },
  })
  const out: BuyingPlan[] = []
  for (const c of courses) {
    const firstPlan = c.plans.find((p) => p.planSubjects.length > 0)
    if (!firstPlan) continue
    out.push({
      planId: firstPlan.id,
      planName: firstPlan.name,
      planSlug: firstPlan.slug,
      courseName: c.name,
      courseSlug: c.slug,
      subjects: firstPlan.planSubjects.map((ps) => ({
        planSubjectId: ps.id,
        subjectId: ps.subjectId,
        subjectName: ps.subject.name,
        originalPrice: ps.originalPrice,
        offerPrice: ps.offerPrice,
      })),
    })
  }
  return out
}

export default async function CsTestSeriesPage() {
  const [settings, buyingPlans] = await Promise.all([getSettings(), getBuyingData()])
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'CS Test Series' },
  ]
  const jsonLd = [
    breadcrumbJsonLd(crumbs),
    faqJsonLd(FAQS),
    organizationJsonLd({
      name: settings.siteName,
      email: settings.supportEmail,
      telephone: settings.supportPhone,
      address: settings.address,
      logoUrl: siteBaseUrl() + '/logo.svg',
      social: [settings.facebook, settings.instagram, settings.twitter, settings.youtube].filter(Boolean),
    }),
  ]

  return (
    <>
      <PublicBreadcrumbs items={crumbs} />

      {/* HERO */}
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-14 lg:py-20 max-w-6xl">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-4 inline-flex items-center gap-1.5 py-1.5">
              <Star className="h-3.5 w-3.5 fill-foreground text-foreground" /> 4.9 / 5 from 3,200+ students
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
              CS Test Series 2026 with <span className="text-primary">hand evaluation</span> by AIRs
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
              Mock tests for every paper of the Company Secretary course — CSEET, CS Executive and CS Professional. Buy only the subjects you need. Write by hand. Get marks, remarks and the evaluated copy back in 5–7 working days.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link href="#buy">Browse plans</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/pricing">See all pricing</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Secure payment</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Instant access</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Human evaluation</span>
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

      {/* WHAT IS */}
      <section className="container mx-auto px-4 py-10 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">What is a CS test series?</h2>
        <p className="text-muted-foreground leading-relaxed">
          A <strong>CS test series</strong> is a structured set of mock tests built to mimic the real ICSI exam pattern for CSEET, CS Executive and CS Professional. You attempt each paper under exam conditions, write your answers by hand, upload the answer sheet, and a human examiner reads it, gives marks and writes specific remarks on your copy.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-4">
          Unlike automated online quizzes that only show a score, a hand-evaluated CS mock test closes the loop between reading and recalling — and tells you <em>exactly</em> where you lost marks and how to fix it next time.
        </p>
      </section>

      {/* WHY US */}
      <section className="container mx-auto px-4 py-12 max-w-6xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Why MY CS MTP is different</h2>
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

      {/* JOURNEY */}
      <section className="border-y bg-muted/20">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">The full CS journey</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            The Company Secretary course is a three-stage qualification conducted by the Institute of Company Secretaries of India (ICSI). We support all three.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {JOURNEY.map((j) => (
              <Card key={j.level}>
                <CardContent className="pt-6">
                  <j.icon className="h-8 w-8 text-primary mb-2" aria-hidden />
                  <h3 className="font-semibold mb-1">{j.level}</h3>
                  <p className="text-sm text-muted-foreground">{j.desc}</p>
                  <Button asChild variant="link" size="sm" className="px-0 mt-2 h-auto">
                    <Link href={`/${j.level === 'CSEET' ? 'cseet' : j.level === 'CS Executive' ? 'cs-executive' : 'cs-professional'}-test-series`}>
                      {j.level} test series <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* HOW MOCKS IMPROVE SCORES */}
      <section className="container mx-auto px-4 py-12 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">How mock tests improve CS scores</h2>
        <p className="text-muted-foreground leading-relaxed">
          Reading is not the same as recalling. Mock tests force you to <em>retrieve</em> — which is what actually builds memory. Each paper you attempt under exam conditions strengthens the recall paths in your brain.
        </p>
        <ol className="mt-4 space-y-2 list-decimal list-inside text-muted-foreground">
          <li>Attempt under exam conditions — no breaks, no books open, phone off.</li>
          <li>After the test, review every wrong answer and the questions you skipped.</li>
          <li>Write down the one concept you missed for each wrong answer.</li>
          <li>Revisit that concept after 2 days, then after a week — spaced repetition.</li>
        </ol>
        <p className="text-muted-foreground leading-relaxed mt-4">
          With hand evaluation, you also get examiner-level feedback — &quot;you missed section 134(2)&quot; or &quot;the principle is right but the application is weak&quot; — which is impossible to get from an automated test.
        </p>
      </section>

      {/* HOW EVALUATION WORKS */}
      <section className="border-t bg-muted/20">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">How our evaluation works</h2>
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TESTIMONIALS.map((t) => (
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
          <div className="text-center mt-8">
            <Button asChild variant="outline">
              <Link href="/pricing">See all plans <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
            </Button>
          </div>
        </div>
      </section>

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

      <JsonLd data={jsonLd} />
    </>
  )
}
