// MY CS MTP — JWT auth helpers
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export interface JwtPayload {
  sub: string  // user id
  email: string
  role: 'STUDENT' | 'ADMIN' | 'EXAMINER'
  impersonating?: string  // original admin id if logged in as student
}

export async function hashPassword(p: string): Promise<string> {
  return bcrypt.hash(p, 10)
}

export async function verifyPassword(p: string, hash: string): Promise<boolean> {
  return bcrypt.compare(p, hash)
}

export async function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as JwtPayload['role'],
      impersonating: payload.impersonating as string | undefined,
    }
  } catch {
    return null
  }
}

// ----- Token extraction from request -----
export function extractToken(req: Request): string | null {
  const h = req.headers.get('authorization')
  if (h && h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim()
  // Also accept ?token= for download redirect URLs
  const u = new URL(req.url)
  const t = u.searchParams.get('token')
  if (t) return t
  return null
}

// ----- Token via cookie for client nav -----
export function extractTokenAny(req: Request): string | null {
  const bearer = extractToken(req)
  if (bearer) return bearer
  // Cookie
  const cookie = req.headers.get('cookie') || ''
  for (const part of cookie.split(';')) {
    const [k, v] = part.trim().split('=')
    if (k === 'mtp_token' && v) return v
  }
  return null
}

export const COOKIE_NAME = 'mtp_token'
