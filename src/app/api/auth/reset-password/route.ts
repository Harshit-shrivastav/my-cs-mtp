import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { verifyByToken } from '@/lib/email'

const schema = z.object({
  token: z.string().min(1, 'Missing reset token.'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[A-Za-z]/, 'Password must include a letter.')
    .regex(/[0-9]/, 'Password must include a number.'),
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
  const { token, newPassword } = parsed.data

  const result = await verifyByToken(token, 'PASSWORD_RESET')
  if (!result) {
    return NextResponse.json(
      { error: 'This reset link is invalid, expired, or already used.' },
      { status: 400 }
    )
  }

  const passwordHash = await hashPassword(newPassword)
  await db.user.update({
    where: { id: result.userId },
    data: { passwordHash },
  })

  return NextResponse.json({ ok: true })
}
