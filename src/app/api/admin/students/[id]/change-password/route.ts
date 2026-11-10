// MY CS MTP — Admin: change student password. ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { hashPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const schema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[A-Za-z]/, 'Password must include a letter.')
    .regex(/[0-9]/, 'Password must include a number.'),
})

export async function POST(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!user) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'User is not a student.' }, { status: 400 })

  const passwordHash = await hashPassword(parsed.data.newPassword)
  await db.user.update({ where: { id }, data: { passwordHash } })

  return NextResponse.json({ ok: true })
}
