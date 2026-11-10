import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import {
  sendVerificationEmail,
  send2FALoginEmail,
  sendPasswordResetEmail,
} from '@/lib/email'

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  purpose: z.enum(['EMAIL_VERIFY', 'LOGIN_2FA', 'PASSWORD_RESET']),
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
  const { email, purpose } = parsed.data

  // Rate limit: 3 per hour per email
  const rl = rateLimit(`resend:${purpose}:${email}`, 3, 60 * 60 * 1000)
  if (!rl.ok) return rateLimitResponse(rl)

  const user = await db.user.findUnique({ where: { email } })
  // Always return 200 — don't leak existence
  if (!user) return NextResponse.json({ ok: true })

  try {
    if (purpose === 'EMAIL_VERIFY') {
      await sendVerificationEmail(user.id, user.email, user.name)
    } else if (purpose === 'LOGIN_2FA') {
      await send2FALoginEmail(user.id, user.email)
    } else if (purpose === 'PASSWORD_RESET') {
      await sendPasswordResetEmail(user.id, user.email)
    }
  } catch (e) {
    console.error('Failed to resend verification', e)
    return NextResponse.json(
      { error: 'Could not send the email. Please try again later.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
