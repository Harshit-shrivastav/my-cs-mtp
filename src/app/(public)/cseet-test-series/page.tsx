// MY CS MTP — /cseet-test-series
import type { Metadata } from 'next'
import { ExamLevelLanding, type ExamLandingContent } from '@/components/public/exam-level-landing'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'CSEET Test Series 2026 — Mock Tests with Evaluation',
  description:
    'CSEET mock test series 2026 — chapterwise and full mocks for all four CSEET papers with hand evaluation. Buy only the subjects you need. Evaluated copies in 5–7 days.',
  keywords: [
    'cseet test series',
    'cseet mock test 2026',
    'cseet online test',
    'cseet chapterwise tests',
    'cseet preparation',
    'cseet business communication',
    'cseet legal aptitude',
    'icsi cseet mock test',
  ],
  alternates: { canonical: '/cseet-test-series' },
  openGraph: {
    title: 'CSEET Test Series 2026 — Mock Tests with Evaluation',
    description:
      'CSEET mock test series 2026 — chapterwise and full mocks for all four CSEET papers with hand evaluation.',
    url: '/cseet-test-series',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MY CS MTP' }],
  },
}

const content: ExamLandingContent = {
  courseSlug: 'cseet',
  courseKey: 'CSEET',
  crumbs: [
    { name: 'Home', href: '/' },
    { name: 'CS Test Series', href: '/cs-test-series' },
    { name: 'CSEET Test Series' },
  ],
  hero: {
    badge: 'CSEET 2026 — May Session',
    title: <>CSEET Test Series 2026 — <span className="text-primary">hand-evaluated</span> mock tests</>,
    subtitle:
      'Practice for the Company Secretary Executive Entrance Test with chapterwise and full mocks for all four CSEET papers — Business Communication, Legal Aptitude & Logical Reasoning, Economic & Commercial Environment, and Current Affairs. Buy only the subjects you need.',
    ctaPrimary: { label: 'Browse CSEET plans', href: '#buy' },
    ctaSecondary: { label: 'See all pricing', href: '/pricing' },
  },
  whatIs: {
    title: 'What is CSEET?',
    paragraphs: [
      'The Company Secretary Executive Entrance Test (CSEET) is the entry-level examination conducted by the Institute of Company Secretaries of India (ICSI). It is mandatory for every student who wishes to register for the CS Executive Programme.',
      'CSEET is held twice a year (January and May sessions). It is a 2-hour computer-based test of 200 marks, with four papers and a viva-voce component. Students who clear CSEET become eligible to register for the CS Executive Programme.',
      'The right CSEET test series helps you cover the full ICSI syllabus, practise the MCQ pattern under timed conditions, and identify your weak chapters well before the actual exam — without the shock of facing the real pattern for the first time in the exam hall.',
    ],
  },
  pattern: {
    title: 'CSEET exam pattern & marking scheme',
    intro: 'CSEET consists of four papers, each of 50 marks, plus a viva-voce of 15 marks. The exam is conducted online at ICSI-designated centres.',
    rows: [
      { label: 'Paper 1', value: 'Business Communication — 50 marks (MCQ + viva)' },
      { label: 'Paper 2', value: 'Legal Aptitude & Logical Reasoning — 50 marks (MCQ + viva)' },
      { label: 'Paper 3', value: 'Economic & Commercial Environment — 50 marks (MCQ + viva)' },
      { label: 'Paper 4', value: 'Current Affairs — 50 marks (MCQ + viva)' },
      { label: 'Viva-voce', value: '15 marks per paper (Presentation + Communication skills)' },
      { label: 'Passing', value: '40% in each paper + 50% aggregate. No negative marking.' },
    ],
  },
  why: {
    title: 'Why our CSEET test series works',
    intro: 'CSEET is largely MCQ-based, but the viva-voce makes preparation different from a standard objective test. Our mocks cover both the objective pattern and answer-writing discipline that helps in the viva.',
    features: [
      { title: 'Full 4-paper coverage', text: 'Unitwise and chapterwise tests for all four CSEET papers in a single plan, or buy subjects individually.' },
      { title: 'Current Affairs updates', text: 'Current Affairs mocks are kept up-to-date with the latest 6-month current events you actually need for CSEET.' },
      { title: 'Logical reasoning sets', text: 'Paper 2 is a mix of legal aptitude and logical reasoning — our mocks drill both, with detailed solutions.' },
      { title: 'Viva-oriented writing', text: 'Even though CSEET is MCQ, writing out reasoning builds the communication skills the viva tests. Our answer keys show you the model reasoning.' },
      { title: 'Lightning-fast evaluation', text: 'CSEET students typically receive evaluated copies in 5–7 working days — far faster than industry norms.' },
      { title: 'Beginner-friendly UI', text: 'If this is your first online test series, our dashboard walks you through every step — from buying a paper to uploading your answer sheet.' },
    ],
  },
  howItWorks: {
    title: 'How it works',
    steps: [
      { title: 'Pick your CSEET plan', text: 'Choose the Unitwise (all subjects) plan or the Chapterwise (per subject) plan. Pay only for the subjects you select.' },
      { title: 'Download question paper', text: 'Get the question paper instantly in your dashboard after payment. Attempt it under exam conditions.' },
      { title: 'Write & upload', text: 'Write by hand and scan/upload the answer sheet (PDF/JPG/PNG up to 50 MB) from your dashboard.' },
      { title: 'Get marks + feedback', text: 'A human examiner evaluates your copy and writes specific remarks. Typically returned within 5–7 working days.' },
    ],
  },
  testimonials: [
    { name: 'Ananya R.', course: 'CSEET — May 2025', text: 'I cleared CSEET in my first attempt. The unitwise mocks covered every important topic and the evaluation feedback told me exactly where I was losing marks.', rating: 5 },
    { name: 'Karan M.', course: 'CSEET — Jan 2025', text: 'Schedules are well-structured. I always knew which test was coming next, so I never had to plan separately.', rating: 4 },
    { name: 'Meera J.', course: 'CSEET — May 2024', text: 'Current Affairs tests were updated right up to the exam window. That alone gave me 8–10 marks I would not have had otherwise.', rating: 5 },
    { name: 'Aman D.', course: 'CSEET — Jan 2024', text: 'I was worried about logical reasoning. The chapterwise tests broke it down step by step and I scored 42/50 in that paper.', rating: 5 },
  ],
  faqs: [
    { q: 'Is the CSEET test series online or offline?', a: 'It is fully online. You download the question paper from your dashboard, attempt it offline by hand, and upload the scanned answer sheet for evaluation.' },
    { q: 'How many mock tests are included per CSEET plan?', a: 'Each plan includes chapterwise + full mock tests for every CSEET subject you purchase. The exact count varies per subject and is shown on the plan page.' },
    { q: 'Are the CSEET mocks based on the latest ICSI syllabus?', a: 'Yes. Every mock test is updated to the latest ICSI CSEET syllabus. Current Affairs tests are refreshed regularly, especially in the run-up to the May and January sessions.' },
    { q: 'Can I buy only one or two CSEET subjects?', a: 'Yes. Inside the CSEET Chapterwise plan, you can pick only the subjects you want. Pay only for what you select.' },
    { q: 'How is the answer sheet evaluated?', a: 'A human examiner reads your answer sheet, gives marks as per the ICSI marking pattern, and writes specific remarks. You receive the evaluated copy in your dashboard.' },
    { q: 'How long does CSEET evaluation take?', a: 'Typically 5–7 working days. You receive an email and an in-app notification once your evaluated copy is ready.' },
    { q: 'Do I get any free CSEET study material?', a: 'Yes. Our dashboard includes free resources (syllabus PDFs, exam pattern guides) that any registered student can download, even without a purchase.' },
    { q: 'What if I am not satisfied?', a: 'You can request a callback via the Contact page. Our refund policy is available on the Refund Policy page.' },
  ],
}

export default async function CseetTestSeriesPage() {
  return <ExamLevelLanding content={content} />
}
