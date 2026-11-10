// MY CS MTP — role-guard helpers for API routes
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, extractTokenAny, JwtPayload } from '@/lib/auth'

export interface AuthCtx {
  payload: JwtPayload
  user: {
    id: string
    email: string
    role: 'STUDENT' | 'ADMIN' | 'EXAMINER'
    name: string | null
    mobile: string | null
    courseId: string | null
    isBlocked: boolean
  }
}

export async function requireAuth(req: Request): Promise<AuthCtx | NextResponse> {
  const token = extractTokenAny(req)
  if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  const user = await db.user.findUnique({ where: { id: payload.sub } })
  if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 401 })
  if (user.isBlocked) return NextResponse.json({ error: 'Your account is blocked. Contact support.' }, { status: 403 })
  return {
    payload,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      mobile: user.mobile,
      courseId: user.courseId,
      isBlocked: user.isBlocked,
    },
  }
}

export async function requireRole(req: Request, role: 'STUDENT' | 'ADMIN' | 'EXAMINER'): Promise<AuthCtx | NextResponse> {
  const r = await requireAuth(req)
  if (r instanceof NextResponse) return r
  if (r.user.role !== role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return r
}

export function isAuthCtx(x: AuthCtx | NextResponse): x is AuthCtx {
  return !(x instanceof NextResponse)
}
