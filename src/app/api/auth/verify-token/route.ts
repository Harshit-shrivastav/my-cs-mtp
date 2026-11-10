import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { verifyByToken } from '@/lib/email'
import { setAuthCookie } from '@/lib/auth-cookie'
import { issueResetSessionToken } from '@/lib/auth-helpers'
import { homeForRole } from '@/lib/role-home'

const schema = z.object({
  token: z.string().min(1, 'Missing token.'),
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
  const { token, purpose } = parsed.data

  const result = await verifyByToken(token, purpose)
  if (!result) {
    return NextResponse.json(
      { error: 'This link is invalid, expired, or already used.' },
      { status: 400 }
    )
  }
  const userId = result.userId

  if (purpose === 'EMAIL_VERIFY') {
    await db.user.update({ where: { id: userId }, data: { emailVerified: new Date() } })
    return NextResponse.json({ ok: true, action: 'EMAIL_VERIFIED' })
  }

  if (purpose === 'LOGIN_2FA') {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 400 })
    }
    await db.user.update({
      where: { id: userId },
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
  const resetToken = await issueResetSessionToken(userId)
  return NextResponse.json({ ok: true, action: 'RESET_LINK', resetToken })
}
