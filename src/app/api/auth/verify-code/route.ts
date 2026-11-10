import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { verifyByCode } from '@/lib/email'
import { setAuthCookie } from '@/lib/auth-cookie'
import { issueResetSessionToken } from '@/lib/auth-helpers'
import { homeForRole } from '@/lib/role-home'

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  purpose: z.enum(['EMAIL_VERIFY', 'LOGIN_2FA', 'PASSWORD_RESET']),
  code: z.string().length(6, 'Enter the 6-digit code.'),
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
  const { email, purpose, code } = parsed.data

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 })
  }

  const ok = await verifyByCode(user.id, purpose, code)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 })
  }

  if (purpose === 'EMAIL_VERIFY') {
    await db.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } })
    return NextResponse.json({ ok: true, action: 'EMAIL_VERIFIED' })
  }

  if (purpose === 'LOGIN_2FA') {
    await db.user.update({
      where: { id: user.id },
      data: {
        twoFactorPending: false,
        twoFactorCodeHash: null,
        twoFactorExpiresAt: null,
      },
    })
    const jwt = await signToken({ sub: user.id, email: user.email, role: user.role })
    const res = NextResponse.json({ ok: true, action: 'LOGGED_IN', redirect: homeForRole(user.role) })
    setAuthCookie(res, jwt)
    return res
  }

  // PASSWORD_RESET: issue a fresh short-lived reset-session token
  const resetToken = await issueResetSessionToken(user.id)
  return NextResponse.json({ ok: true, action: 'RESET_LINK', resetToken })
}
