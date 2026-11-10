import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword, signToken } from '@/lib/auth'
import { setAuthCookie } from '@/lib/auth-cookie'
import { makeReferralCode } from '@/lib/utils-extra'
import { sendWelcomeEmail } from '@/lib/email'
import { getSettings } from '@/lib/settings'

const schema = z.object({
  name: z.string().trim().min(2, 'Name is too short.').max(120, 'Name is too long.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  mobile: z
    .string()
    .trim()
    .min(10, 'Enter a valid 10-digit mobile number.')
    .max(15, 'Enter a valid mobile number.')
    .regex(/^[0-9+\-\s]+$/, 'Enter a valid mobile number.'),
  courseId: z.string().min(1, 'Please choose a course.'),
  password: z
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

  const { name, email, mobile, courseId, password } = parsed.data

  // Check email uniqueness
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    return NextResponse.json(
      { error: 'Email already registered. Please log in.' },
      { status: 400 }
    )
  }

  // Verify course exists
  const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true } })
  if (!course) {
    return NextResponse.json({ error: 'Selected course was not found.' }, { status: 400 })
  }

  // Create user
  const passwordHash = await hashPassword(password)
  const referralCode = makeReferralCode(name, email)
  const user = await db.user.create({
    data: {
      name,
      email,
      mobile,
      passwordHash,
      emailVerified: new Date(), // no email verification for students (owner rule, 2026-11-10)
      role: 'STUDENT',
      courseId,
      referralCode,
    },
    select: { id: true, email: true, name: true },
  })

  // Promotional wallet credit on signup (setting-driven; credit 0 = disabled)
  try {
    const settings = await getSettings()
    if (settings.promoWalletAmount > 0) {
      await db.$transaction(async (tx) => {
        const wallet = await tx.wallet.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id, balance: 0 },
        })
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: settings.promoWalletAmount } },
        })
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: user.id,
            amount: settings.promoWalletAmount,
            type: 'CREDIT',
            reason: 'Promotional credit on signup',
            reference: 'PROMO_SIGNUP',
          },
        })
      })
    }
  } catch (e) {
    console.error('Promotional wallet credit failed on signup', e)
  }

  // No verification step for students: the account is active immediately.
  // Send a confirmation email ("your account has been created") with a login link.
  try {
    await sendWelcomeEmail(user.email, user.name)
  } catch (e) {
    console.error('Failed to send account-created email on signup', e)
  }

  // Sign the student in straight away and send them to their dashboard.
  const token = await signToken({ sub: user.id, email: user.email, role: 'STUDENT' })
  const res = NextResponse.json({ ok: true, email: user.email, redirect: '/dashboard' })
  setAuthCookie(res, token)
  return res
}
