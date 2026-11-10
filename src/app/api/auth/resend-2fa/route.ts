import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { send2FALoginEmail } from '@/lib/email'

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
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
  const { email } = parsed.data

  // Rate limit: 3 per 10 minutes by email
  const rl = rateLimit(`resend-2fa:${email}`, 3, 10 * 60 * 1000)
  if (!rl.ok) return rateLimitResponse(rl)

  const user = await db.user.findUnique({ where: { email } })
  // Always return 200 — don't leak existence
  if (!user) return NextResponse.json({ ok: true })

  if (user.role === 'ADMIN') {
    // Admins don't use 2FA — silently succeed
    return NextResponse.json({ ok: true })
  }

  try {
    await send2FALoginEmail(user.id, user.email)
  } catch (e) {
    console.error('Failed to resend 2FA', e)
    return NextResponse.json(
      { error: 'Could not send login code. Please try again later.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
