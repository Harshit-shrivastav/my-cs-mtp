// MY CS MTP — /cs-test-series-review
// SEO reviews page. Hardcoded testimonials in a grid + AggregateRating JSON-LD.
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'
import { PublicBreadcrumbs } from '@/components/public/breadcrumbs'
import { JsonLd, breadcrumbJsonLd, siteBaseUrl, absUrl } from '@/components/public/seo'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'CS Test Series Reviews — Student Feedback & Results',
  description:
    'Read what Company Secretary students say about MY CS MTP — CSEET, CS Executive and CS Professional mock test series with hand evaluation. Real reviews, real ratings.',
  keywords: [
    'MY CS MTP reviews',
    'cs test series review',
    'cseet test series feedback',
    'cs executive mock test reviews',
    'cs professional test series reviews',
    'company secretary mock test student reviews',
  ],
  alternates: { canonical: '/cs-test-series-review' },
  openGraph: {
    title: 'CS Test Series Reviews — Student Feedback & Results',
    description: 'Read what Company Secretary students say about MY CS MTP mock test series with hand evaluation.',
    url: '/cs-test-series-review',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MY CS MTP' }],
  },
}

interface Review {
  name: string
  course: string
  text: string
  rating: number
  date: string
}

const REVIEWS: Review[] = [
  { name: 'Ananya R.', course: 'CSEET — May 2025', text: 'I cleared CSEET in my first attempt. The unitwise mocks covered every important topic and the evaluation feedback told me exactly where I was losing marks.', rating: 5, date: '2025-06-12' },
  { name: 'Rohan S.', course: 'CS Executive — June 2025', text: 'The chapterwise plan let me prepare one subject at a time. Hand evaluation was a game-changer — much better than just getting a score.', rating: 5, date: '2025-07-02' },
  { name: 'Sneha P.', course: 'CS Professional — June 2025', text: 'Mentorship by AIRs was the best part. My mentor fixed my strategy for the elective paper and I scored 67 in that module.', rating: 5, date: '2025-07-21' },
  { name: 'Karan M.', course: 'CSEET — Jan 2025', text: 'Schedules are well-structured. I always knew which test was coming next, so I never had to plan separately.', rating: 4, date: '2025-02-05' },
  { name: 'Priya V.', course: 'CS Executive — Dec 2024', text: 'The performance charts helped me see my weak chapters. I improved my Company Law score from 48 to 71.', rating: 5, date: '2025-01-15' },
  { name: 'Aditya K.', course: 'CS Professional — Dec 2024', text: 'Notes and amendments on MY CS MTP are accurate and up-to-date. I cleared all three professional modules using only these mocks.', rating: 5, date: '2025-02-08' },
  { name: 'Meera J.', course: 'CSEET — May 2024', text: 'Current Affairs tests were updated right up to the exam window. That alone gave me 8–10 marks I would not have had otherwise.', rating: 5, date: '2024-05-30' },
  { name: 'Aman D.', course: 'CSEET — Jan 2024', text: 'I was worried about logical reasoning. The chapterwise tests broke it down step by step and I scored 42/50 in that paper.', rating: 5, date: '2024-02-10' },
  { name: 'Sahil T.', course: 'CS Executive — June 2025', text: 'Attempted both modules together. The combo plan covered all six subjects and saved me a full attempt cycle.', rating: 5, date: '2025-07-11' },
  { name: 'Neha K.', course: 'CS Executive — Dec 2024', text: 'Securities Laws is huge. The chapterwise tests broke it down into manageable chunks and the answer keys had the latest SEBI amendments.', rating: 4, date: '2025-01-25' },
  { name: 'Vikas R.', course: 'CS Professional — June 2025', text: 'The Drafting paper evaluation was incredibly detailed — the examiner red-penned my form, structure and even my sentence framing.', rating: 5, date: '2025-07-30' },
  { name: 'Ritu S.', course: 'CS Professional — Dec 2024', text: 'I attempted the Combined plan and saved a full attempt cycle. The combo pricing is genuinely the best value I found.', rating: 4, date: '2025-02-12' },
]

export default async function CsTestSeriesReviewPage() {
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Reviews' },
  ]
  const total = REVIEWS.length
  const sum = REVIEWS.reduce((s, r) => s + r.rating, 0)
  const avg = (sum / total).toFixed(1)
  const ratingCount = (n: number) => REVIEWS.filter((r) => r.rating === n).length

  const aggregateLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'MY CS MTP — CS Test Series',
    description: 'CS test series with hand evaluation for CSEET, CS Executive and CS Professional.',
    brand: { '@type': 'Brand', name: 'MY CS MTP' },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: avg,
      reviewCount: total,
      bestRating: 5,
      worstRating: 1,
    },
    review: REVIEWS.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.name },
      datePublished: r.date,
      reviewBody: r.text,
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    })),
  }

  return (
    <>
      <PublicBreadcrumbs items={crumbs} />

      <section className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">MY CS MTP Reviews</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Real student reviews of MY CS MTP&apos;s CS mock test series across CSEET, CS Executive and CS Professional.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.round(Number(avg)) ? 'fill-foreground text-foreground' : 'text-muted-foreground/30'}`} />
              ))}
            </div>
            <span className="font-semibold">{avg}</span>
            <span className="text-muted-foreground">· {total} reviews</span>
          </div>
        </div>

        {/* Rating distribution */}
        <Card className="mb-10 max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((n) => {
                const c = ratingCount(n)
                const pct = total === 0 ? 0 : Math.round((c / total) * 100)
                return (
                  <div key={n} className="flex items-center gap-2 text-sm">
                    <span className="w-12 text-muted-foreground">{n} star{n === 1 ? '' : 's'}</span>
                    <div className="flex-1 bg-muted rounded h-2 overflow-hidden">
                      <div className="h-2 bg-foreground" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{c}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REVIEWS.map((r) => (
            <Card key={r.name + r.course}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-0.5 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-foreground text-foreground' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic mb-4">&quot;{r.text}&quot;</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.course}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{new Date(r.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 border rounded-xl bg-muted/30 p-6 sm:p-10 text-center">
          <h2 className="text-xl sm:text-2xl font-bold">Want to be featured?</h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            If you are a MY CS MTP student, send us your review and we&apos;ll feature it on this page. Honest feedback helps other CS students choose well.
          </p>
          <Button asChild className="mt-5">
            <Link href="/contact">Send us your review</Link>
          </Button>
        </div>
      </section>

      <JsonLd data={[breadcrumbJsonLd(crumbs), aggregateLd]} />
    </>
  )
}
