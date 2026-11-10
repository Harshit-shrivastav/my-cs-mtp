// MY CS MTP — /cs-executive-test-series
import type { Metadata } from 'next'
import { ExamLevelLanding, type ExamLandingContent } from '@/components/public/exam-level-landing'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'CS Executive Test Series 2026 — Module 1 & 2 Mock Tests',
  description:
    'CS Executive test series 2026 with hand evaluation — Module 1, Module 2 and Both Modules. Chapterwise mocks for JIGL, Company Law, Securities Laws, EBC Laws and more.',
  keywords: [
    'cs executive test series',
    'cs executive mock test',
    'cs executive module 1 test series',
    'cs executive module 2 test series',
    'cs executive chapterwise tests',
    'company law mock test',
    'icsi cs executive',
  ],
  alternates: { canonical: '/cs-executive-test-series' },
  openGraph: {
    title: 'CS Executive Test Series 2026 — Module 1 & 2 Mock Tests',
    description:
      'CS Executive mock test series with hand evaluation. Module 1, Module 2 and Both Modules. Buy only the subjects you need.',
    url: '/cs-executive-test-series',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MY CS MTP' }],
  },
}

const content: ExamLandingContent = {
  courseSlug: 'cs-executive',
  courseKey: 'CS_EXECUTIVE',
  crumbs: [
    { name: 'Home', href: '/' },
    { name: 'CS Test Series', href: '/cs-test-series' },
    { name: 'CS Executive Test Series' },
  ],
  hero: {
    badge: 'CS Executive — June 2026',
    title: <>CS Executive Test Series 2026 — <span className="text-primary">hand evaluation</span> for Modules 1 & 2</>,
    subtitle:
      'Mock tests for every CS Executive paper — JIGL, Company Law, Setting up of Business (Module 1) and Corporate & Management Accounting, Securities Laws, EBC Laws (Module 2). Buy Module 1, Module 2 or Both Modules at the best combo price.',
    ctaPrimary: { label: 'Browse CS Executive plans', href: '#buy' },
    ctaSecondary: { label: 'See all pricing', href: '/pricing' },
  },
  whatIs: {
    title: 'What is CS Executive?',
    paragraphs: [
      'CS Executive is the second stage of the Company Secretary course conducted by ICSI. It bridges CSEET and CS Professional. The programme is split into two modules, each with three descriptive papers of 100 marks (3 hours each).',
      'A student must clear both Module 1 and Module 2 to become eligible for CS Professional. You may attempt one module at a time or both together — the choice depends on your preparation time and comfort level.',
      'Because CS Executive is descriptive (unlike CSEET which is MCQ-based), the writing practice you get from a proper test series is even more critical. Length, structure, presentation, and case-law citation all carry marks — and only human evaluation can give you feedback on those.',
    ],
  },
  pattern: {
    title: 'CS Executive exam pattern',
    intro: 'Two modules, each with three descriptive papers of 100 marks. Each paper is 3 hours long. Passing criteria: 40% in each paper + 50% aggregate per module.',
    rows: [
      { label: 'Module 1 — Paper 1', value: 'Jurisprudence, Interpretation & General Laws (JIGL)' },
      { label: 'Module 1 — Paper 2', value: 'Company Law' },
      { label: 'Module 1 — Paper 3', value: 'Setting up of Business Entities' },
      { label: 'Module 2 — Paper 4', value: 'Corporate & Management Accounting' },
      { label: 'Module 2 — Paper 5', value: 'Securities Laws & Capital Markets' },
      { label: 'Module 2 — Paper 6', value: 'Economic, Business & Commercial Laws' },
    ],
  },
  why: {
    title: 'Why our CS Executive test series works',
    intro: 'CS Executive is the stage where writing practice matters most. Our mocks simulate the real ICSI pattern and our evaluators mark you the way ICSI does.',
    features: [
      { title: 'Descriptive answer writing', text: 'Real exam-style questions, model answers and examiner remarks that tell you what to add or cut from each answer.' },
      { title: 'Module flexibility', text: 'Buy Module 1, Module 2 or the Both Modules combo — switch freely depending on which sitting you are targeting.' },
      { title: 'Case-law and section citations', text: 'Our answer keys emphasise the correct sections and case-law citations — ICSI examiners reward this heavily.' },
      { title: 'Working notes practice', text: 'For Accounting papers, our evaluators check working notes — a step most online test platforms skip entirely.' },
      { title: 'Schedule discipline', text: 'Plan → schedule → test → evaluate. Each module plan includes a published test schedule so you never miss a sitting.' },
      { title: 'Mentorship by AIRs', text: 'Book one-on-one sessions with All India Rankers for paper-attempt technique, time management or revision strategy.' },
    ],
  },
  howItWorks: {
    title: 'How it works',
    steps: [
      { title: 'Pick your Module', text: 'Choose Module 1, Module 2 or the Both Modules combo plan. Pay only for the subjects you select inside the plan.' },
      { title: 'Download question paper', text: 'Get the question paper instantly in your dashboard after payment. Attempt it under exam conditions.' },
      { title: 'Write & upload', text: 'Write by hand. Scan and upload your answer sheet (PDF/JPG/PNG up to 50 MB) from your dashboard.' },
      { title: 'Get marks + feedback', text: 'A human examiner evaluates your copy and writes specific remarks. Typically returned within 5–7 working days.' },
    ],
  },
  testimonials: [
    { name: 'Rohan S.', course: 'CS Executive — June 2025', text: 'The chapterwise plan let me prepare one subject at a time. Hand evaluation was a game-changer — much better than just getting a score.', rating: 5 },
    { name: 'Priya V.', course: 'CS Executive — Dec 2024', text: 'The performance charts helped me see my weak chapters. I improved my Company Law score from 48 to 71.', rating: 5 },
    { name: 'Sahil T.', course: 'CS Executive — June 2025', text: 'Attempted both modules together. The combo plan covered all six subjects and saved me a full attempt cycle.', rating: 5 },
    { name: 'Neha K.', course: 'CS Executive — Dec 2024', text: 'Securities Laws is huge. The chapterwise tests broke it down into manageable chunks and the answer keys had the latest SEBI amendments.', rating: 4 },
  ],
  faqs: [
    { q: 'Should I attempt Module 1 first or both modules together?', a: 'If you are a full-time student, attempt both modules together — the combined plan offers the best value and saves an attempt cycle. If you are working, attempt Module 1 first, since its subjects (especially Company Law) form the foundation for Module 2.' },
    { q: 'How many mock tests are included per CS Executive subject?', a: 'Each subject includes chapterwise tests plus a full mock. The exact count varies per subject and is shown on the plan page.' },
    { q: 'Are the mocks based on the latest ICSI syllabus and amendments?', a: 'Yes. Every paper is updated to the latest ICSI CS Executive syllabus. Notes and amendment files are available inside your dashboard.' },
    { q: 'How is the answer sheet evaluated?', a: 'A human examiner reads your descriptive answers, gives marks as per the ICSI marking pattern, and writes specific remarks (e.g. "missed section 134(2)" or "working notes absent"). You receive the evaluated copy in your dashboard.' },
    { q: 'Can I get my answer sheet re-evaluated?', a: 'For a re-look, contact us within 7 days of receiving the evaluated copy. Re-evaluation is at our discretion.' },
    { q: 'How long does CS Executive evaluation take?', a: 'Typically 5–7 working days. You receive an email and an in-app notification once your evaluated copy is ready.' },
    { q: 'Do you provide model answers?', a: 'Yes. Each paper has a model answer key. For some papers, answer downloads are enabled (look for the "Solution" button on the paper page in your dashboard).' },
    { q: 'What if I am not satisfied?', a: 'You can request a callback via the Contact page. Our refund policy is available on the Refund Policy page.' },
  ],
}

export default async function CsExecutiveTestSeriesPage() {
  return <ExamLevelLanding content={content} />
}
