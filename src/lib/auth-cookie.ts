// MY CS MTP — helpers for setting/clearing the JWT cookie on a NextResponse
import { NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth'

const WEEK_SECONDS = 60 * 60 * 24 * 7
const TRUST_COOKIE = 'mtp_trusted'

export function setAuthCookie(res: NextResponse, token: string, maxAgeSeconds = WEEK_SECONDS): void {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  })
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export function setTrustCookie(res: NextResponse, token: string): void {
  res.cookies.set(TRUST_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export function readTrustCookie(req: Request): string | null {
  const cookie = req.headers.get('cookie') || ''
  for (const part of cookie.split(';')) {
    const [k, v] = part.trim().split('=')
    if (k === TRUST_COOKIE && v) return v
  }
  return null
}

export const TRUST_COOKIE_NAME = TRUST_COOKIE
