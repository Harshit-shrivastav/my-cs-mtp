// MY CS MTP — Student self-service: GET profile, PATCH profile.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx
  const userId = ctx.user.id

  const [user, wallet, course] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, mobile: true, courseId: true, role: true },
    }),
    db.wallet.findUnique({ where: { userId }, select: { balance: true } }),
    db.user.findUnique({ where: { id: userId } }).then((u) =>
      u?.courseId ? db.course.findUnique({ where: { id: u.courseId }, select: { name: true } }) : null
    ),
  ])

  if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      courseId: user.courseId,
      courseName: course?.name ?? null,
      role: user.role,
      walletBalance: wallet?.balance ?? 0,
    },
  })
}

const patchSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short.').max(120, 'Name is too long.').optional(),
  mobile: z
    .string()
    .trim()
    .min(10, 'Enter a valid 10-digit mobile number.')
    .max(15, 'Enter a valid mobile number.')
    .regex(/^[0-9+\-\s]+$/, 'Enter a valid mobile number.')
    .optional(),
  courseId: z.string().min(1).optional(),
}).refine((v) => v.name !== undefined || v.mobile !== undefined || v.courseId !== undefined, {
  message: 'Provide at least one field to update.',
})

export async function PATCH(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx
  const userId = ctx.user.id

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input.' },
      { status: 400 }
    )
  }
  const { name, mobile, courseId } = parsed.data

  // If courseId is changing, verify the new course exists & is active
  if (courseId) {
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, isActive: true },
    })
    if (!course || !course.isActive) {
      return NextResponse.json({ error: 'Selected course was not found.' }, { status: 400 })
    }
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(mobile !== undefined ? { mobile } : {}),
      ...(courseId !== undefined ? { courseId } : {}),
    },
    select: { id: true, name: true, email: true, mobile: true, courseId: true, role: true },
  })

  return NextResponse.json({ user: updated })
}
