// MY CS MTP — Admin: send a newsletter / broadcast email. ADMIN-only.
// audience: SUBSCRIBERS (active newsletter subscribers) | ALL_STUDENTS | COURSE.
// Loops sendMail per recipient with per-user error catch, then records a
// NewsletterLog row (recipientCount = successful sends).
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { sendMail } from '@/lib/email'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

const sendSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required.').max(200, 'Subject is too long.'),
  body: z.string().trim().min(1, 'Body is required.').max(20000, 'Body is too long.'),
  audience: z.enum(['SUBSCRIBERS', 'ALL_STUDENTS', 'COURSE'], {
    message: 'Audience must be SUBSCRIBERS, ALL_STUDENTS or COURSE.',
  }),
  courseId: z.string().trim().optional().nullable(),
})

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtml(subject: string, body: string, siteName: string): string {
  const paragraphs = body
    .split(/\r?\n/)
    .map((line) => `<p style="margin:0 0 10px;">${escapeHtml(line) || '&nbsp;'}</p>`)
    .join('')
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color:#0f172a; margin-top:0;">${escapeHtml(subject)}</h2>
      ${paragraphs}
      <p style="color:#64748b; font-size:13px; margin-top:24px;">— ${escapeHtml(siteName)} team</p>
    </div>
  `
}

export async function POST(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input.' },
      { status: 400 }
    )
  }
  const { subject, body: messageBody, audience } = parsed.data
  const courseId = parsed.data.courseId || null

  if (audience === 'COURSE' && !courseId) {
    return NextResponse.json({ error: 'courseId is required when audience is COURSE.' }, { status: 400 })
  }

  let course: { id: string; name: string } | null = null
  if (audience === 'COURSE') {
    course = await db.course.findUnique({ where: { id: courseId! }, select: { id: true, name: true } })
    if (!course) return NextResponse.json({ error: 'Selected course was not found.' }, { status: 400 })
  }

  // Resolve recipient emails by audience.
  let emails: string[] = []
  if (audience === 'SUBSCRIBERS') {
    const subs = await db.newsletterSubscriber.findMany({
      where: { isActive: true },
      select: { email: true },
    })
    emails = subs.map((s) => s.email.toLowerCase())
  } else {
    const users = await db.user.findMany({
      where: {
        role: 'STUDENT',
        isBlocked: false,
        ...(audience === 'COURSE' ? { courseId } : {}),
      },
      select: { email: true },
    })
    emails = users.map((u) => u.email.toLowerCase())
  }

  // Dedupe
  const unique = Array.from(new Set(emails))
  const total = unique.length

  if (total === 0) {
    return NextResponse.json(
      { error: 'No recipients matched this audience — nothing was sent.' },
      { status: 400 }
    )
  }

  const settings = await getSettings()
  const html = buildHtml(subject, messageBody, settings.siteName)
  const text = `${subject}\n\n${messageBody}\n\n— ${settings.siteName} team`

  let successCount = 0
  let failureCount = 0
  for (const to of unique) {
    try {
      await sendMail({ to, subject, html, text })
      successCount++
    } catch (e) {
      failureCount++
      console.error(`Newsletter send failed for ${to}:`, e instanceof Error ? e.message : e)
    }
  }

  const log = await db.newsletterLog.create({
    data: {
      subject,
      body: messageBody,
      recipientCount: successCount,
    },
  })

  return NextResponse.json({
    ok: true,
    audience,
    total,
    successCount,
    failureCount,
    logId: log.id,
  })
}
