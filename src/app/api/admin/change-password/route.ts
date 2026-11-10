// MY CS MTP — Admin change own password API. ADMIN-only.
// bcrypt-compares the current password against the logged-in ADMIN user, then
// updates passwordHash.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { hashPassword, verifyPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const schema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long.')
    .regex(/[A-Za-z]/, 'New password must include a letter.')
    .regex(/[0-9]/, 'New password must include a number.')
    .max(100, 'New password is too long.'),
})

export async function POST(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input.' },
      { status: 400 }
    )
  }

  const user = await db.user.findUnique({ where: { id: ctx.user.id }, select: { id: true, passwordHash: true } })
  if (!user) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 401 })
  }

  const currentOk = await verifyPassword(parsed.data.currentPassword, user.passwordHash)
  if (!currentOk) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
  }

  const sameAsOld = await verifyPassword(parsed.data.newPassword, user.passwordHash)
  if (sameAsOld) {
    return NextResponse.json({ error: 'New password must be different from the current password.' }, { status: 400 })
  }

  const passwordHash = await hashPassword(parsed.data.newPassword)
  await db.user.update({ where: { id: user.id }, data: { passwordHash } })

  return NextResponse.json({ ok: true })
}
