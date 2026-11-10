// MY CS MTP — Public Lead capture endpoint.
// Used by the popup, contact forms and any "Request a callback" widget.
// Public (no auth). Validates input lightly and persists a Lead row.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const schema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(160).optional().or(z.literal('')),
  mobile: z.string().trim().max(20).optional(),
  courseInterest: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(60).optional(),
}).refine((d) => Boolean(d.email || d.mobile), {
  message: 'Please provide either an email or a mobile number.',
  path: ['email'],
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input.' },
      { status: 400 }
    )
  }
  const d = parsed.data

  // Light rate-limit by IP + mobile/email to prevent spam
  const key = `lead:${d.email || d.mobile || 'anon'}`
  const rl = rateLimit(key, 5, 10 * 60 * 1000) // 5 leads per 10 minutes
  if (!rl.ok) return rateLimitResponse(rl)

  await db.lead.create({
    data: {
      name: d.name || null,
      email: d.email || null,
      mobile: d.mobile || null,
      courseInterest: d.courseInterest || null,
      message: d.message || null,
      source: d.source || 'PUBLIC_FORM',
    },
  })

  return NextResponse.json({ ok: true })
}
