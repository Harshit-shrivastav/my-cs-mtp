import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sendPasswordResetEmail } from '@/lib/email'

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

  // Rate limit: 3 per hour by email
  const rl = rateLimit(`forgot-password:${email}`, 3, 60 * 60 * 1000)
  if (!rl.ok) return rateLimitResponse(rl)

  // Always return generic success — never leak account existence
  const user = await db.user.findUnique({ where: { email } })
  if (user) {
    try {
      await sendPasswordResetEmail(user.id, user.email)
    } catch (e) {
      console.error('Failed to send password reset email', e)
    }
  }

  return NextResponse.json({ ok: true })
}
