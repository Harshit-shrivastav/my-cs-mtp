// MY CS MTP — Newsletter subscribe endpoint.
// Public (no auth). If subscriber exists by email, reactivate; else create new.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  source: z.string().trim().max(60).optional(),
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
  const { email, source } = parsed.data

  const rl = rateLimit(`newsletter:${email}`, 3, 10 * 60 * 1000)
  if (!rl.ok) return rateLimitResponse(rl)

  const existing = await db.newsletterSubscriber.findUnique({ where: { email } })
  if (existing) {
    if (!existing.isActive) {
      await db.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { isActive: true, source: source || existing.source },
      })
    }
    return NextResponse.json({ ok: true, reactivated: true })
  }

  await db.newsletterSubscriber.create({
    data: { email, source: source || 'FOOTER_FORM', isActive: true },
  })
  return NextResponse.json({ ok: true, reactivated: false })
}
