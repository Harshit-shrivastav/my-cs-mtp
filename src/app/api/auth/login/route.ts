import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { verifyPassword, signToken } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { send2FALoginEmail } from '@/lib/email'
import { setAuthCookie, readTrustCookie, setTrustCookie } from '@/lib/auth-cookie'
import { homeForRole } from '@/lib/role-home'

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
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
  const { email, password, trustDevice } = parsed.data

  // Rate limit by email: 5 attempts per 10 minutes
  const rl = rateLimit(`login:${email}`, 5, 10 * 60 * 1000)
  if (!rl.ok) return rateLimitResponse(rl)

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  const passwordOk = await verifyPassword(password, user.passwordHash)
  if (!passwordOk) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  if (user.isBlocked) {
    return NextResponse.json(
      { error: 'Your account is blocked. Please contact support.' },
      { status: 403 }
    )
  }

  // Determine if 2FA is required.
  // 2FA applies to ADMIN accounts ONLY (owner rule, 2026-11-10): students and
  // examiners sign in with email + password alone.
  // For admins, skip 2FA if:
  //   - user has trustedDeviceToken AND trustDevice checkbox is checked on this request, OR
  //   - the mtp_trusted cookie matches user.trustedDeviceToken
  const trustedCookie = readTrustCookie(req)
  const cookieTrustMatches =
    user.trustedDeviceToken && trustedCookie && trustedCookie === user.trustedDeviceToken
  const trustDeviceSkip =
    user.trustedDeviceToken && trustDevice && user.trustedDeviceToken.length > 0

  const settings = await getSettings()
  const twoFactorRequired =
    user.role === 'ADMIN' &&
    settings.twoFactorEnabled &&
    !cookieTrustMatches &&
    !trustDeviceSkip

  if (!twoFactorRequired) {
    // Sign JWT, set cookie, return redirect
    const token = await signToken({ sub: user.id, email: user.email, role: user.role })
    const res = NextResponse.json({ redirect: homeForRole(user.role) })
    setAuthCookie(res, token)
    // Refresh the trust cookie if it already matched or if user has a token
    if (user.trustedDeviceToken && (cookieTrustMatches || trustDeviceSkip)) {
      setTrustCookie(res, user.trustedDeviceToken)
    }
    return res
  }

  // 2FA required — issue a LOGIN_2FA token and email it
  try {
    await send2FALoginEmail(user.id, user.email)
  } catch (e) {
    console.error('Failed to send 2FA email', e)
    return NextResponse.json(
      { error: 'Could not send login code. Please try again.' },
      { status: 500 }
    )
  }
  await db.user.update({
    where: { id: user.id },
    data: { twoFactorPending: true },
  })

  return NextResponse.json({ twoFactorRequired: true, email: user.email })
}
