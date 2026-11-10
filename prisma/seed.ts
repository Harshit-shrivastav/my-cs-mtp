// MY CS MTP — Seed script. Idempotent. Run: `bun run db:seed`
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

function env(key: string, fallback: string): string {
  return process.env[key] || fallback
}

async function main() {
  console.log('Seeding MY CS MTP...')

  // -------- 1. SiteConfig defaults (the settings service reads these) --------
  const settings: Record<string, string> = {
    site_name: 'MY CS MTP',
    site_tagline: 'Online mock-test series for CS students — CSEET, Executive & Professional',
    site_theme_color: '#000000',
    contact_email: 'support@mycsmtp.com',
    contact_phone: '+91 90000 00000',
    whatsapp_number: '919000000000',
    whatsapp_link: 'https://wa.me/919000000000',
    contact_address: 'New Delhi, India',
    social_facebook: 'https://facebook.com/mycsmtp',
    social_instagram: 'https://instagram.com/mycsmtp',
    social_twitter: 'https://twitter.com/mycsmtp',
    social_youtube: 'https://youtube.com/@mycsmtp',
    currency_symbol: '₹',
    subjects_before_view_more: '4',
    assignment_upload_enabled: 'true',
    assignment_upload_disabled_message: 'Assignment uploads are temporarily disabled. Please try again later.',
    free_content_enabled: 'true',
    two_factor_enabled: 'true',
    evaluation_promise_text: 'Evaluated copies are typically returned within 5–7 working days.',
    promo_wallet_amount: '50',
    promo_wallet_rules: 'Promotional wallet credit is added to your wallet on signup. Non-refundable. Cannot be withdrawn.',
    google_analytics_id: '',
    referral_reward_type: 'WALLET',
    referral_reward_value: '50',
    referral_rules: 'Refer a friend. When they make their first paid purchase, both of you get ₹50 in your wallet.',
    sale_popup_enabled: 'false',
    sale_popup_title: 'Welcome offer!',
    sale_popup_text: 'Use code WELCOME10 for 10% off on your first test series.',
    sale_popup_delay_seconds: '5',
    sale_popup_frequency: 'ONCE_PER_SESSION',
    active_payment_gateway: 'MOCK',
    payment_mode: 'SANDBOX',
    razorpay_enabled: 'false',
    cashfree_enabled: 'false',
  }
  for (const [k, v] of Object.entries(settings)) {
    await db.siteConfig.upsert({ where: { key: k }, update: {}, create: { key: k, value: v } })
  }

  // -------- 2. Admin account --------
  const adminEmail = env('SEED_ADMIN_EMAIL', 'admin@mycsmtp.com')
  const adminPass = env('SEED_ADMIN_PASSWORD', 'Admin@1234')
  const adminHash = await bcrypt.hash(adminPass, 10)
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN', passwordHash: adminHash, isBlocked: false },
    create: {
      email: adminEmail,
      name: 'Site Admin',
      mobile: '9000000000',
      passwordHash: adminHash,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  })
  console.log(`Admin ready: ${admin.email}`)

  // -------- 3. Courses --------
  const cseet = await db.course.upsert({
    where: { slug: 'cseet' },
    update: {},
    create: {
      name: 'CSEET',
      slug: 'cseet',
      description: 'Company Secretary Executive Entrance Test — full mock test series covering all four papers.',
      sortOrder: 1,
      seoTitle: 'CSEET Test Series 2026',
      seoDescription: 'Practice CSEET with full mock tests, chapterwise tests and detailed solutions for all four CSEET papers.',
      seoKeywords: 'cseet test series, cseet mock test, cseet online test, company secretary entrance test',
    },
  })
  const exec = await db.course.upsert({
    where: { slug: 'cs-executive' },
    update: {},
    create: {
      name: 'CS Executive',
      slug: 'cs-executive',
      description: 'Company Secretary Executive Programme — Module 1, Module 2 and combined mock test series.',
      sortOrder: 2,
      seoTitle: 'CS Executive Test Series 2026',
      seoDescription: 'Chapterwise and full mock test series for CS Executive Module 1 and Module 2, with expert evaluation.',
      seoKeywords: 'cs executive test series, cs executive mock test, company secretary executive',
    },
  })
  const prof = await db.course.upsert({
    where: { slug: 'cs-professional' },
    update: {},
    create: {
      name: 'CS Professional',
      slug: 'cs-professional',
      description: 'Company Secretary Professional Programme — module-wise and elective mock test series.',
      sortOrder: 3,
      seoTitle: 'CS Professional Test Series 2026',
      seoDescription: 'Full and chapterwise mock test series for CS Professional (2022 syllabus) with detailed evaluation and feedback.',
      seoKeywords: 'cs professional test series, cs professional mock test, company secretary professional',
    },
  })

  // -------- 4. Subjects --------
  const cseetSubjects = [
    { name: 'Business Communication', slug: 'business-communication' },
    { name: 'Legal Aptitude & Logical Reasoning', slug: 'legal-aptitude-logical-reasoning' },
    { name: 'Economic & Commercial Environment', slug: 'economic-commercial-environment' },
    { name: 'Current Affairs', slug: 'current-affairs' },
  ]
  const execMod1Subjects = [
    { name: 'Jurisprudence, Interpretation & General Laws', slug: 'jurisprudence-interpretation-general-laws' },
    { name: 'Company Law', slug: 'company-law' },
    { name: 'Setting up of Business Entities', slug: 'setting-up-of-business-entities' },
  ]
  const execMod2Subjects = [
    { name: 'Corporate & Management Accounting', slug: 'corporate-management-accounting' },
    { name: 'Securities Laws & Capital Markets', slug: 'securities-laws-capital-markets' },
    { name: 'Economic, Business & Commercial Laws', slug: 'economic-business-commercial-laws' },
  ]
  const profSubjects = [
    { name: 'Corporate Governance & Stakeholder Management', slug: 'corporate-governance-stakeholder-management' },
    { name: 'Corporate Restrstructuring', slug: 'corporate-restructuring' },
    { name: 'Resolution of Corporate Disputes', slug: 'resolution-corporate-disputes' },
    { name: 'Drafting, Pleadings & Appearances', slug: 'drafting-pleadings-appearances' },
  ]

  async function ensureSubjects(courseId: string, list: { name: string; slug: string }[]) {
    const out = []
    let i = 0
    for (const s of list) {
      const rec = await db.subject.upsert({
        where: { slug: s.slug },
        update: { courseId },
        create: { name: s.name, slug: s.slug, courseId, sortOrder: i++ },
      })
      out.push(rec)
    }
    return out
  }

  const cseetSubs = await ensureSubjects(cseet.id, cseetSubjects)
  const execM1 = await ensureSubjects(exec.id, execMod1Subjects)
  const execM2 = await ensureSubjects(exec.id, execMod2Subjects)
  const profSubs = await ensureSubjects(prof.id, profSubjects)

  // -------- 5. Plans --------
  const cseetUnitwise = await db.plan.upsert({
    where: { slug: 'cseet-unitwise' },
    update: {},
    create: {
      courseId: cseet.id,
      name: 'CSEET Unitwise (All Subjects)',
      slug: 'cseet-unitwise',
      description: 'Unitwise test series covering all four CSEET subjects in one plan.',
      tags: 'unitwise,all-subjects,combo',
      isActive: true,
      sortOrder: 1,
      seoTitle: 'CSEET Unitwise Test Series — All Subjects',
      seoDescription: 'Unitwise test series covering all four CSEET subjects in one plan.',
    },
  })
  const cseetChapterwise = await db.plan.upsert({
    where: { slug: 'cseet-chapterwise' },
    update: {},
    create: {
      courseId: cseet.id,
      name: 'CSEET Chapterwise (Per Subject)',
      slug: 'cseet-chapterwise',
      description: 'Chapterwise tests available per subject — buy only the subjects you need.',
      tags: 'chapterwise,per-subject',
      isActive: true,
      sortOrder: 2,
      seoTitle: 'CSEET Chapterwise Tests — Per Subject',
      seoDescription: 'Pick any CSEET subject and practice chapterwise tests.',
    },
  })

  const execM1Plan = await db.plan.upsert({
    where: { slug: 'cs-executive-module-1-chapterwise' },
    update: {},
    create: {
      courseId: exec.id,
      name: 'CS Executive Module 1 (Chapterwise)',
      slug: 'cs-executive-module-1-chapterwise',
      description: 'Chapterwise tests for all three subjects in CS Executive Module 1.',
      tags: 'chapterwise,module-1',
      isActive: true,
      sortOrder: 1,
      seoTitle: 'CS Executive Module 1 Chapterwise Tests',
      seoDescription: 'Chapterwise mock tests for CS Executive Module 1 — JIGL, Company Law, Setting up of Business.',
    },
  })
  const execM2Plan = await db.plan.upsert({
    where: { slug: 'cs-executive-module-2-chapterwise' },
    update: {},
    create: {
      courseId: exec.id,
      name: 'CS Executive Module 2 (Chapterwise)',
      slug: 'cs-executive-module-2-chapterwise',
      description: 'Chapterwise tests for all three subjects in CS Executive Module 2.',
      tags: 'chapterwise,module-2',
      isActive: true,
      sortOrder: 2,
      seoTitle: 'CS Executive Module 2 Chapterwise Tests',
      seoDescription: 'Chapterwise mock tests for CS Executive Module 2 — Corporate & Management Accounting, Securities Laws, EBC Laws.',
    },
  })
  const execBothPlan = await db.plan.upsert({
    where: { slug: 'cs-executive-both-modules-chapterwise' },
    update: {},
    create: {
      courseId: exec.id,
      name: 'CS Executive Both Modules (Chapterwise)',
      slug: 'cs-executive-both-modules-chapterwise',
      description: 'Chapterwise tests for all six subjects in CS Executive Module 1 + Module 2 — best value.',
      tags: 'chapterwise,both-modules,combo',
      isActive: true,
      sortOrder: 3,
      seoTitle: 'CS Executive Both Modules Chapterwise Tests',
      seoDescription: 'Chapterwise mock tests for both modules of CS Executive at a special combo price.',
    },
  })

  const profM1Plan = await db.plan.upsert({
    where: { slug: 'cs-professional-module-1' },
    update: {},
    create: {
      courseId: prof.id,
      name: 'CS Professional Module 1',
      slug: 'cs-professional-module-1',
      description: 'Tests for CS Professional Module 1 subjects.',
      tags: 'module-1',
      isActive: true,
      sortOrder: 1,
      seoTitle: 'CS Professional Module 1 Tests',
      seoDescription: 'Mock tests for CS Professional Module 1 with expert evaluation.',
    },
  })
  const profM2Plan = await db.plan.upsert({
    where: { slug: 'cs-professional-module-2' },
    update: {},
    create: {
      courseId: prof.id,
      name: 'CS Professional Module 2',
      slug: 'cs-professional-module-2',
      description: 'Tests for CS Professional Module 2 subjects.',
      tags: 'module-2',
      isActive: true,
      sortOrder: 2,
      seoTitle: 'CS Professional Module 2 Tests',
      seoDescription: 'Mock tests for CS Professional Module 2 with expert evaluation.',
    },
  })
  const profCombo = await db.plan.upsert({
    where: { slug: 'cs-professional-combined' },
    update: {},
    create: {
      courseId: prof.id,
      name: 'CS Professional Combined',
      slug: 'cs-professional-combined',
      description: 'All CS Professional subjects in one combo plan — best value.',
      tags: 'combo,all-modules',
      isActive: true,
      sortOrder: 3,
      seoTitle: 'CS Professional Combined Test Series',
      seoDescription: 'Full CS Professional mock test series across all modules — one price, all subjects.',
    },
  })

  // -------- 6. PlanSubjects with sample prices --------
  async function linkPlanSubjects(planId: string, courseId: string, subjects: any[], perSubjectOriginal: number, perSubjectOffer: number) {
    for (let i = 0; i < subjects.length; i++) {
      const s = subjects[i]
      await db.planSubject.upsert({
        where: { planId_subjectId: { planId, subjectId: s.id } },
        update: {},
        create: {
          planId,
          subjectId: s.id,
          originalPrice: perSubjectOriginal,
          offerPrice: perSubjectOffer,
          isActive: true,
        },
      })
    }
  }
  // CSEET Unitwise — all subjects combined at one offer price
  await linkPlanSubjects(cseetUnitwise.id, cseet.id, cseetSubs, 999, 499)
  // CSEET Chapterwise — per subject pricing
  await linkPlanSubjects(cseetChapterwise.id, cseet.id, cseetSubs, 799, 399)
  // Executive Module 1
  await linkPlanSubjects(execM1Plan.id, exec.id, execM1, 1199, 599)
  // Executive Module 2
  await linkPlanSubjects(execM2Plan.id, exec.id, execM2, 1199, 599)
  // Executive Both Modules
  await linkPlanSubjects(execBothPlan.id, exec.id, [...execM1, ...execM2], 1199, 499)
  // Professional M1 / M2 / Combined
  await linkPlanSubjects(profM1Plan.id, prof.id, profSubs.slice(0, 2), 1499, 749)
  await linkPlanSubjects(profM2Plan.id, prof.id, profSubs.slice(2, 4), 1499, 749)
  await linkPlanSubjects(profCombo.id, prof.id, profSubs, 1499, 599)

  // -------- 7. Sample papers (one per first subject per plan) --------
  async function seedPapers(planId: string, courseId: string, subjects: any[]) {
    for (let i = 0; i < subjects.length; i++) {
      const s = subjects[i]
      const ps = await db.planSubject.findUnique({ where: { planId_subjectId: { planId, subjectId: s.id } } })
      if (!ps) continue
      const slug = `${s.slug}-mock-1`
      await db.testPaper.upsert({
        where: { slug },
        update: {},
        create: {
          planSubjectId: ps.id,
          courseId,
          planId,
          subjectId: s.id,
          title: `${s.name} — Mock Test 1`,
          slug,
          description: `Chapterwise mock test 1 for ${s.name}.`,
          totalMarks: 100,
          isActive: true,
          sortOrder: 1,
          allowAnswerDownload: true,
        },
      })
    }
  }
  await seedPapers(cseetUnitwise.id, cseet.id, cseetSubs)
  await seedPapers(cseetChapterwise.id, cseet.id, cseetSubs)
  await seedPapers(execM1Plan.id, exec.id, execM1)
  await seedPapers(execM2Plan.id, exec.id, execM2)
  await seedPapers(execBothPlan.id, exec.id, [...execM1, ...execM2])
  await seedPapers(profM1Plan.id, prof.id, profSubs.slice(0, 2))
  await seedPapers(profM2Plan.id, prof.id, profSubs.slice(2, 4))
  await seedPapers(profCombo.id, prof.id, profSubs)

  // -------- 8. Free resources --------
  await db.freeResource.upsert({
    where: { id: 'free-cseet-syllabus-pdf' },
    update: {},
    create: {
      id: 'free-cseet-syllabus-pdf',
      title: 'CSEET Syllabus 2026 — Free PDF',
      description: 'Download the official ICSI CSEET syllabus as a free PDF.',
      courseId: cseet.id,
      isPublic: true,
      isActive: true,
      sortOrder: 1,
    },
  })
  await db.freeResource.upsert({
    where: { id: 'free-exam-pattern-pdf' },
    update: {},
    create: {
      id: 'free-exam-pattern-pdf',
      title: 'CS Exam Pattern & Marking Scheme',
      description: 'Understand the marking scheme, paper pattern and negative marking rules for CS exams.',
      isPublic: true,
      isActive: true,
      sortOrder: 2,
    },
  })

  // -------- 9. Schedule name + sample schedules --------
  const schedName = await db.scheduleName.upsert({
    where: { id: 'sched-cseet-unitwise' },
    update: {},
    create: { id: 'sched-cseet-unitwise', planId: cseetUnitwise.id, name: 'CSEET Unitwise Schedule' },
  })
  await db.schedule.upsert({
    where: { id: 'sched-1' },
    update: { fileKey: 'schedules/cseet-unitwise-schedule.pdf' },
    create: {
      id: 'sched-1',
      planId: cseetUnitwise.id,
      scheduleNameId: schedName.id,
      courseId: cseet.id,
      title: 'CSEET Unitwise Test Schedule — Jan–Mar 2026',
      description: 'Complete schedule of unitwise tests for CSEET.',
      isPublic: true,
      publishedAt: new Date(),
      fileKey: 'schedules/cseet-unitwise-schedule.pdf',
    },
  })
  await db.schedule.upsert({
    where: { id: 'sched-2' },
    update: { fileKey: 'schedules/cs-executive-both-modules-schedule.pdf' },
    create: {
      id: 'sched-2',
      planId: execBothPlan.id,
      courseId: exec.id,
      title: 'CS Executive Both Modules — Test Schedule',
      description: 'Schedule for chapterwise tests across both modules.',
      isPublic: true,
      publishedAt: new Date(),
      fileKey: 'schedules/cs-executive-both-modules-schedule.pdf',
    },
  })

  // -------- 10. Exam timings --------
  const next = (y: number, m: number, d: number) => {
    const date = new Date()
    date.setFullYear(y, m - 1, d)
    return date
  }
  await db.examTiming.upsert({
    where: { courseId: cseet.id },
    update: {},
    create: {
      courseId: cseet.id,
      courseKey: 'CSEET',
      examName: 'CSEET 2026 (May Session)',
      examDate: next(2026, 5, 9),
      isVisible: true,
    },
  })
  await db.examTiming.upsert({
    where: { courseId: exec.id },
    update: {},
    create: {
      courseId: exec.id,
      courseKey: 'CS_EXECUTIVE',
      examName: 'CS Executive June 2026',
      examDate: next(2026, 6, 1),
      isVisible: true,
    },
  })
  await db.examTiming.upsert({
    where: { courseId: prof.id },
    update: {},
    create: {
      courseId: prof.id,
      courseKey: 'CS_PROFESSIONAL',
      examName: 'CS Professional June 2026',
      examDate: next(2026, 6, 1),
      isVisible: true,
    },
  })

  // -------- 11. Custom pages --------
  const customPages = [
    {
      title: 'About Us',
      slug: 'about-us',
      showInHeader: true,
      showInFooter: true,
      seoTitle: 'About Us — Who We Are',
      seoDescription: 'MY CS MTP is an independent online test series platform for Company Secretary students.',
      content: `# About MY CS MTP\n\nMY CS MTP is an independent online mock-test series platform built specifically for Company Secretary students in India preparing for the ICSI exams — CSEET, CS Executive and CS Professional.\n\nOur mission is simple: help every CS student pass on the first attempt by giving them real exam-style mock tests, expert evaluation, and feedback that closes the loop.\n\n## What we offer\n\n- Unitwise and chapterwise mock tests for every CS paper\n- Hand-evaluation by experienced checkers\n- Personal mentorship by All India Rankers\n- Notes, amendments and free resources\n\n## Why students trust us\n\nWe focus only on CS. We do not dilute our content across CA or CMA. Every paper is written and evaluated by people who have themselves cleared the CS exams.`,
    },
    {
      title: 'Privacy Policy',
      slug: 'privacy-policy',
      showInHeader: false,
      showInFooter: true,
      seoTitle: 'Privacy Policy',
      seoDescription: 'How MY CS MTP collects, uses and protects your personal information.',
      content: `# Privacy Policy\n\nThis privacy policy explains how MY CS MTP collects, uses and protects your information.\n\n## Information we collect\n\n- Your name, email, mobile number when you register\n- Your test submissions and evaluation records\n- Your payment records (we do not store card numbers or net-banking credentials — those are handled by our payment gateways)\n\n## How we use it\n\n- To provide the test-series service\n- To send you evaluation results, important updates and (with your consent) marketing offers\n- To improve our content and evaluation quality\n\n## Your rights\n\nYou can request access to or deletion of your data by emailing us. We respond within 7 working days.`,
    },
    {
      title: 'Terms of Use',
      slug: 'terms-of-use',
      showInHeader: false,
      showInFooter: true,
      seoTitle: 'Terms of Use',
      seoDescription: 'Terms governing the use of the MY CS MTP platform.',
      content: `# Terms of Use\n\nBy accessing or using MY CS MTP you agree to the following terms.\n\n1. You may not share your account with others.\n2. Test papers, notes and other content are protected by copyright. You may not redistribute them.\n3. Refunds are governed by our Refund Policy.\n4. We may suspend or terminate accounts that violate these terms.`,
    },
    {
      title: 'Refund Policy',
      slug: 'refund-policy',
      showInHeader: false,
      showInFooter: true,
      seoTitle: 'Refund Policy',
      seoDescription: 'Refund and cancellation policy for MY CS MTP purchases.',
      content: `# Refund Policy\n\n- Since test papers and notes are digital content delivered instantly, we generally do not offer refunds once access is granted.\n- If a payment fails but money is debited, the amount will be refunded to your source account within 7 working days.\n- For any grievance, email us with your order id and we will respond within 48 hours.`,
    },
    {
      title: 'Contact',
      slug: 'contact',
      showInHeader: true,
      showInFooter: true,
      seoTitle: 'Contact MY CS MTP',
      seoDescription: 'Get in touch with the MY CS MTP team for support, mentorship or partnership.',
      content: `# Contact MY CS MTP\n\nFor any questions about test series, payments or mentorship, reach us:\n\n- Email: support@mycsmtp.com\n- WhatsApp: +91 90000 00000\n- Address: New Delhi, India\n\nWe usually respond within one working day.`,
    },
  ]
  for (const p of customPages) {
    await db.customPage.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...p, isActive: true },
    })
  }

  // -------- 12. Sample blog posts --------
  const blogPosts = [
    {
      title: 'How to prepare for CSEET 2026 — a complete strategy',
      slug: 'how-to-prepare-for-cseet-2026',
      excerpt: 'A step-by-step CSEET 2026 preparation plan covering syllabus, daily schedule, mock tests and revision.',
      tags: 'cseet,preparation,strategy',
      seoTitle: 'How to prepare for CSEET 2026 — Complete Strategy',
      seoDescription: 'Step-by-step CSEET 2026 preparation plan: syllabus breakdown, daily schedule, mock tests and revision strategy.',
      content: `# How to prepare for CSEET 2026 — a complete strategy\n\nThe Company Secretary Executive Entrance Test (CSEET) is the entry point to the CS course. With the right strategy, it is very achievable in 3–4 months.\n\n## 1. Understand the syllabus\n\nCSEET has four papers — Business Communication, Legal Aptitude & Logical Reasoning, Economic & Commercial Environment, and Current Affairs.\n\n## 2. Build a daily schedule\n\nAim for 4–5 focused hours daily, divided as:\n\n- 1 hour — Business Communication\n- 1.5 hours — Legal Aptitude & Logical Reasoning\n- 1 hour — Economic & Commercial Environment\n- 30 minutes — Current Affairs\n- 1 hour — revision and mock tests\n\n## 3. Practise mock tests\n\nMock tests are non-negotiable. At MY CS MTP we provide chapterwise and full mocks for every CSEET paper, with hand evaluation.\n\n## 4. Revise smart\n\nUse spaced repetition. Revisit each chapter after 1 day, 1 week and 1 month.\n\n## 5. Stay updated\n\nFor Current Affairs, follow a daily current-affairs source in the last 60 days before the exam.\n\nGood luck!`,
      publishedAt: new Date(),
    },
    {
      title: 'CS Executive Module 1 vs Module 2 — what to attempt first',
      slug: 'cs-executive-module-1-vs-2',
      excerpt: 'Should you attempt Module 1 first or both modules together? A practical guide for CS Executive students.',
      tags: 'cs-executive,preparation,modules',
      seoTitle: 'CS Executive Module 1 vs Module 2 — what to attempt first',
      seoDescription: 'Practical guidance on whether CS Executive students should attempt Module 1 alone or both modules together.',
      content: `# CS Executive Module 1 vs Module 2 — what to attempt first\n\nThis is one of the most common questions CS students ask. Here is our honest take.\n\n## If you are a full-time student\n\nAttempt both modules together. You save one attempt cycle and the combined plan on MY CS MTP offers the best value.\n\n## If you are working\n\nAttempt Module 1 first. The subjects in Module 1 (especially Company Law) form the foundation for Module 2.\n\n## How MY CS MTP helps\n\nWe offer chapterwise test plans for Module 1, Module 2 and a combined Both Modules plan — pick what fits your schedule.`,
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      title: 'Why mock tests are the fastest way to improve your CS scores',
      slug: 'why-mock-tests-improve-scores',
      excerpt: 'Mock tests close the loop between reading and recalling. Here is why they work — and how to use them.',
      tags: 'preparation,mock-tests,strategy',
      seoTitle: 'Why mock tests improve CS scores',
      seoDescription: 'How mock tests help Company Secretary students retain and apply what they study, and how to get the most out of them.',
      content: `# Why mock tests are the fastest way to improve your CS scores\n\nReading is not the same as recalling. Mock tests force you to retrieve, which is what actually builds memory.\n\n## The science\n\nActive recall — attempting questions without looking — is far more effective than re-reading notes. Each mock test you take strengthens that recall.\n\n## What to do after each test\n\n1. Attempt the test under exam conditions — no breaks, no books open.\n2. After the test, review every wrong answer.\n3. Write down the one concept you missed.\n4. Revisit that concept after 2 days.\n\n## How MY CS MTP helps\n\nWe hand-evaluate every answer sheet, so you get specific feedback — not just a number.`,
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ]
  for (const p of blogPosts) {
    await db.blogPost.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...p, status: 'PUBLISHED', authorName: 'MY CS MTP Team' },
    })
  }

  // -------- 13. ReferralConfig / PopupConfig / PaymentGatewayConfig --------
  await db.referralConfig.upsert({
    where: { id: 'referral-default' },
    update: {},
    create: {
      id: 'referral-default',
      rewardType: 'WALLET',
      rewardValue: 50,
      rules: 'Refer a friend. When they make their first paid purchase, both of you get ₹50 in your wallet.',
      isActive: true,
    },
  })
  await db.popupConfig.upsert({
    where: { id: 'popup-default' },
    update: {},
    create: {
      id: 'popup-default',
      enabled: false,
      title: 'Welcome offer!',
      text: 'Use code WELCOME10 for 10% off on your first test series.',
      delaySeconds: 5,
      frequency: 'ONCE_PER_SESSION',
    },
  })
  await db.paymentGatewayConfig.upsert({
    where: { id: 'pgc-default' },
    update: {},
    create: {
      id: 'pgc-default',
      activeGateway: 'MOCK',
      mode: 'SANDBOX',
      razorpayEnabled: false,
      cashfreeEnabled: false,
    },
  })

  // -------- 14. Email templates --------
  const templates = [
    { key: 'welcome', subject: 'Welcome to MY CS MTP', body: 'Hi {{name}}, welcome to MY CS MTP. Your account is ready.' },
    { key: 'verify_email', subject: 'Verify your email on MY CS MTP', body: 'Use OTP {{code}} or click the verification link: {{link}}' },
    { key: 'login_2fa', subject: 'Your MY CS MTP login code', body: 'Use OTP {{code}} or click the link: {{link}}' },
    { key: 'password_reset', subject: 'Reset your MY CS MTP password', body: 'Use OTP {{code}} or click the link: {{link}}' },
    { key: 'purchase_success', subject: 'Purchase successful — MY CS MTP', body: 'Thanks for your purchase. Order {{orderId}}. Amount {{amount}}.' },
    { key: 'evaluation_completed', subject: 'Your evaluation is ready — MY CS MTP', body: 'Your answer sheet for {{paperTitle}} has been evaluated. Score {{marks}}/{{maxMarks}}.' },
  ]
  for (const t of templates) {
    await db.emailTemplate.upsert({
      where: { key: t.key },
      update: {},
      create: t,
    })
  }

  console.log('Seed complete.')
  console.log('Admin login:')
  console.log('  Email:    ' + adminEmail)
  console.log('  Password: ' + adminPass)
}

main()
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
