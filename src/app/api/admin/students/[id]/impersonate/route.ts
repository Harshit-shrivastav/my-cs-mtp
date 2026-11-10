// MY CS MTP — Admin: impersonate a student. ADMIN-only.
// Generates a new JWT carrying `impersonating: adminId` and sets the cookie.
// The student sees their dashboard; the JWT records that an admin is
// impersonating.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { signToken } from '@/lib/auth'
import { setAuthCookie } from '@/lib/auth-cookie'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const adminId = ctx.user.id
  const { id } = await c.params

  const student = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, isBlocked: true },
  })
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  if (student.role !== 'STUDENT') return NextResponse.json({ error: 'User is not a student.' }, { status: 400 })
  if (student.isBlocked) return NextResponse.json({ error: 'Student is blocked.' }, { status: 400 })

  const token = await signToken({
    sub: student.id,
    email: student.email,
    role: 'STUDENT',
    impersonating: adminId,
  })
  const res = NextResponse.json({ redirect: '/dashboard' })
  setAuthCookie(res, token)
  return res
}
