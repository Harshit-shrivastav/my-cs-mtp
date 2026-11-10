import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { verifyByCode } from '@/lib/email'
import { setAuthCookie, setTrustCookie } from '@/lib/auth-cookie'
import { homeForRole } from '@/lib/role-home'

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  code: z.string().length(6, 'Enter the 6-digit code.'),
  trustDevice: z.boolean().optional().default(false),
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
  const { email, code, trustDevice } = parsed.data

  // Rate limit: 5 attempts per 5 minutes by email
  const rl = rateLimit(`verify-2fa:${email}`, 5, 5 * 60 * 1000)
  if (!rl.ok) return rateLimitResponse(rl)

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 })
  }

  const ok = await verifyByCode(user.id, 'LOGIN_2FA', code)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 })
  }

  // Clear 2FA pending
  const updates: Record<string, unknown> = {
    twoFactorPending: false,
    twoFactorCodeHash: null,
    twoFactorExpiresAt: null,
  }

  // If trust device, generate and persist a trustedDeviceToken (and set the cookie)
  let trustToken: string | null = null
  if (trustDevice) {
    trustToken = randomUUID()
    updates.trustedDeviceToken = trustToken
  }

  await db.user.update({ where: { id: user.id }, data: updates as any })

  const token = await signToken({ sub: user.id, email: user.email, role: user.role })
  const res = NextResponse.json({ redirect: homeForRole(user.role) })
  setAuthCookie(res, token)
  if (trustToken) setTrustCookie(res, trustToken)
  return res
}
