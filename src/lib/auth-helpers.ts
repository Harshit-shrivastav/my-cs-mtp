// MY CS MTP — shared helpers for the auth API routes.
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import type { NextResponse } from 'next/server'
import { setAuthCookie } from '@/lib/auth-cookie'

// Issue a fresh short-lived PASSWORD_RESET session token AFTER a verification link/OTP
// has been validated. This token is then used by /reset-password to actually change the password.
// We deliberately do NOT send an email for this — it's a one-time session token only.
export async function issueResetSessionToken(userId: string): Promise<string> {
  // Invalidate any previous unused PASSWORD_RESET tokens for this user
  await db.verificationToken.updateMany({
    where: { userId, purpose: 'PASSWORD_RESET', usedAt: null },
    data: { usedAt: new Date() },
  })
  const token = randomBytes(32).toString('hex')
  const tokenHash = await bcrypt.hash(token, 10)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  await db.verificationToken.create({
    data: { userId, purpose: 'PASSWORD_RESET', tokenHash, expiresAt },
  })
  return token
}

// Sign a JWT for the user and attach it to the response's httpOnly cookie.
export async function issueSession(
  res: NextResponse,
  user: { id: string; email: string; role: 'STUDENT' | 'ADMIN' | 'EXAMINER' }
): Promise<string> {
  const token = await signToken({ sub: user.id, email: user.email, role: user.role })
  setAuthCookie(res, token)
  return token
}
