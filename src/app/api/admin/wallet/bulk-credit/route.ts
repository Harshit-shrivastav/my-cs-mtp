// MY CS MTP — Admin bulk wallet credit. ADMIN-only.
// Credits every STUDENT wallet (optionally scoped to a course) in one transaction.
// Creates Wallet rows (and a WalletTransaction per wallet) for students that had none.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const schema = z.object({
  courseId: z.string().nullable().optional(),
  amount: z.number().positive('Amount must be greater than 0.'),
  reason: z.string().trim().min(1, 'Reason is required.').max(200, 'Reason must be 200 characters or fewer.'),
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
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }

  const { courseId, amount, reason } = parsed.data

  if (courseId) {
    const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true } })
    if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 404 })
  }

  const students = await db.user.findMany({
    where: {
      role: 'STUDENT',
      ...(courseId ? { courseId } : {}),
    },
    select: { id: true },
  })

  if (students.length === 0) {
    return NextResponse.json({ error: 'No students match the selected scope.' }, { status: 400 })
  }

  const ids = students.map((s) => s.id)
  const reference = courseId ? `BULK:${courseId}` : 'BULK:ALL'

  await db.$transaction(async (tx) => {
    const existing = await tx.wallet.findMany({
      where: { userId: { in: ids } },
      select: { id: true, userId: true },
    })
    const existingUserIds = new Set(existing.map((w) => w.userId))

    const missing = ids.filter((id) => !existingUserIds.has(id))
    if (missing.length > 0) {
      await tx.wallet.createMany({
        data: missing.map((userId) => ({ userId, balance: 0 })),
      })
    }

    await tx.wallet.updateMany({
      where: { userId: { in: ids } },
      data: { balance: { increment: amount } },
    })

    const wallets = await tx.wallet.findMany({
      where: { userId: { in: ids } },
      select: { id: true, userId: true },
    })

    await tx.walletTransaction.createMany({
      data: wallets.map((w) => ({
        walletId: w.id,
        userId: w.userId,
        amount,
        type: 'CREDIT',
        reason,
        reference,
      })),
    })
  })

  return NextResponse.json({ ok: true, affected: ids.length, amount, reason })
}
