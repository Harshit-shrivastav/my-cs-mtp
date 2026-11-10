// MY CS MTP — /cs-professional-test-series
import type { Metadata } from 'next'
import { ExamLevelLanding, type ExamLandingContent } from '@/components/public/exam-level-landing'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'CS Professional Test Series 2026 — Module Tests + Evaluation',
  description:
    'CS Professional test series 2026 — Module 1, Module 2 and Combined plans with hand evaluation. Mock tests for Governance, Restructuring, Dispute Resolution, Drafting and more.',
  keywords: [
    'cs professional test series',
    'cs professional mock test',
    'cs professional module tests',
    'cs professional combined test series',
    'icsi cs professional',
    'company secretary professional',
    'cs professional electives',
  ],
  alternates: { canonical: '/cs-professional-test-series' },
  openGraph: {
    title: 'CS Professional Test Series 2026 — Module Tests + Evaluation',
    description:
      'CS Professional mock test series with hand evaluation. Module 1, Module 2 and Combined plans. Buy only what you need.',
    url: '/cs-professional-test-series',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MY CS MTP' }],
  },
}

const content: ExamLandingContent = {
  courseSlug: 'cs-professional',
  courseKey: 'CS_PROFESSIONAL',
  crumbs: [
    { name: 'Home', href: '/' },
    { name: 'CS Test Series', href: '/cs-test-series' },
    { name: 'CS Professional Test Series' },
  ],
  hero: {
    badge: 'CS Professional — June 2026',
    title: <>CS Professional Test Series 2026 — <span className="text-primary">module tests</span> + evaluation</>,
    subtitle:
      'Mock tests for every CS Professional subject — Corporate Governance, Restructuring, Dispute Resolution, Drafting — with hand evaluation by AIRs. Module 1, Module 2 or the Combined plan.',
    ctaPrimary: { label: 'Browse CS Professional plans', href: '#buy' },
    ctaSecondary: { label: 'See all pricing', href: '/pricing' },
  },
  whatIs: {
    title: 'What is CS Professional?',
    paragraphs: [
      'CS Professional is the final stage of the Company Secretary course conducted by ICSI. It builds on CS Executive and covers advanced, application-oriented papers including electives. Clearing CS Professional (along with the required practical training) makes you eligible to be admitted as an Associate Company Secretary (ACS).',
      'The CS Professional curriculum is organised across modules that include multi-disciplinary, case-study and elective papers. The marking is descriptive, demanding both conceptual clarity and strong writing skills.',
      'Because this is the final stage, every mark counts. A structured test series gives you the writing discipline, time management and examiner-level feedback that turns a 50% paper into a 60%+ paper.',
    ],
  },
  pattern: {
    title: 'CS Professional exam pattern',
    intro: 'CS Professional is split across modules with descriptive papers of 100 marks each (3 hours). Passing criteria: 40% in each paper + 50% aggregate per module. The Open Book exam (where applicable) is also covered.',
    rows: [
      { label: 'Module 1 — Paper 1', value: 'Corporate Governance & Stakeholder Management' },
      { label: 'Module 1 — Paper 2', value: 'Corporate Restructuring' },
      { label: 'Module 2 — Paper 3', value: 'Resolution of Corporate Disputes' },
      { label: 'Module 2 — Paper 4', value: 'Drafting, Pleadings & Appearances' },
      { label: 'Multidisciplinary', value: 'Case-study based papers testing across modules.' },
      { label: 'Elective', value: 'One elective paper (e.g. Banking, Insurance, IPR, Valuation, Public Administration)' },
    ],
  },
  why: {
    title: 'Why our CS Professional test series works',
    intro: 'CS Professional is multi-disciplinary and case-study heavy. Our mocks train you on both — and our evaluators mark the way ICSI does, with attention to structure, citations and application.',
    features: [
      { title: 'Module + Combined plans', text: 'Buy Module 1, Module 2 or the full Combined plan — best value for students attempting all modules together.' },
      { title: 'Case-study focus', text: 'Papers include full case-study questions exactly as ICSI sets them, with model answers that show the issue-rule-application-conclusion structure.' },
      { title: 'Drafting evaluation', text: 'For Drafting papers, our evaluators check the form, structure and language of your draft — not just whether you attempted it.' },
      { title: 'Open-book practice', text: 'Open-book papers require a different strategy. Our mocks train you to find answers fast under the time pressure of an open-book exam.' },
      { title: 'Mentorship by AIRs', text: 'Book one-on-one sessions with All India Rankers — especially useful for electives, where personal guidance matters most.' },
      { title: 'Notes & amendments', text: 'Up-to-date notes, amendment PDFs and case-law digests available inside your dashboard with each purchase.' },
    ],
  },
  howItWorks: {
    title: 'How it works',
    steps: [
      { title: 'Pick your plan', text: 'Choose Module 1, Module 2 or the Combined plan. Pay only for the subjects you select.' },
      { title: 'Download question paper', text: 'Get the question paper instantly in your dashboard after payment. Attempt it under exam conditions.' },
      { title: 'Write & upload', text: 'Write by hand. Scan and upload the answer sheet (PDF/JPG/PNG up to 50 MB) from your dashboard.' },
      { title: 'Get marks + feedback', text: 'A human examiner evaluates your copy and writes specific remarks. Typically returned within 5–7 working days.' },
    ],
  },
  testimonials: [
    { name: 'Sneha P.', course: 'CS Professional — June 2025', text: 'Mentorship by AIRs was the best part. My mentor fixed my strategy for the elective paper and I scored 67 in that module.', rating: 5 },
    { name: 'Aditya K.', course: 'CS Professional — Dec 2024', text: 'Notes and amendments on MY CS MTP are accurate and up-to-date. I cleared all three professional modules using only these mocks.', rating: 5 },
    { name: 'Vikas R.', course: 'CS Professional — June 2025', text: 'The Drafting paper evaluation was incredibly detailed — the examiner red-penned my form, structure and even my sentence framing.', rating: 5 },
    { name: 'Ritu S.', course: 'CS Professional — Dec 2024', text: 'I attempted the Combined plan and saved a full attempt cycle. The combo pricing is genuinely the best value I found.', rating: 4 },
  ],
  faqs: [
    { q: 'How many mock tests are included per CS Professional subject?', a: 'Each subject includes chapterwise tests plus a full mock. The exact count varies per subject and is shown on the plan page.' },
    { q: 'Are the mocks based on the latest ICSI syllabus and amendments?', a: 'Yes. Every paper is updated to the latest ICSI CS Professional syllabus. Notes and amendment files are available inside your dashboard.' },
    { q: 'Do you cover the Open Book exam?', a: 'Yes. Open-book papers are covered with a strategy guide and mocks that train you to find and frame answers fast.' },
    { q: 'How is the answer sheet evaluated?', a: 'A human examiner reads your descriptive answers, gives marks as per the ICSI marking pattern, and writes specific remarks. For Drafting papers, the form and structure of your draft are also marked.' },
    { q: 'Can I buy only one or two CS Professional subjects?', a: 'Yes. Inside any plan you can pick only the subjects you want, and pay only for what you selected.' },
    { q: 'How long does CS Professional evaluation take?', a: 'Typically 5–7 working days. You receive an email and an in-app notification once your evaluated copy is ready.' },
    { q: 'Do you provide mentorship for CS Professional electives?', a: 'Yes. You can request a one-on-one mentorship session from your dashboard. Our mentors are All India Rankers and can guide you on elective strategy.' },
    { q: 'What if I am not satisfied?', a: 'You can request a callback via the Contact page. Our refund policy is available on the Refund Policy page.' },
  ],
}

export default async function CsProfessionalTestSeriesPage() {
  return <ExamLevelLanding content={content} />
}
