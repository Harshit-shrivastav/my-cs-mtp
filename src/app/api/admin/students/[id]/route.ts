// MY CS MTP — Admin: student detail (GET) + delete (DELETE). ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { deleteObject } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      mobile: true,
      role: true,
      isBlocked: true,
      emailVerified: true,
      referralCode: true,
      referredById: true,
      createdAt: true,
      course: { select: { id: true, name: true } },
      wallet: { select: { id: true, balance: true } },
      _count: {
        select: {
          orders: true,
          purchases: true,
          assignments: true,
          cartItems: true,
        },
      },
    },
  })
  if (!user) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'User is not a student.' }, { status: 400 })

  return NextResponse.json({ user })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  })
  if (!user) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'User is not a student.' }, { status: 400 })

  // Cascade-delete everything that references this user.
  const assignments = await db.assignment.findMany({
    where: { studentId: id },
    select: { uploadedFileKey: true, evaluatedFileKey: true },
  })

  await db.$transaction([
    db.notificationRecipient.deleteMany({ where: { userId: id } }),
    db.walletTransaction.deleteMany({ where: { userId: id } }),
    db.cartItem.deleteMany({ where: { userId: id } }),
    db.mentorship.deleteMany({ where: { studentId: id } }),
    db.assignment.deleteMany({ where: { studentId: id } }),
    db.purchase.deleteMany({ where: { userId: id } }),
    db.order.deleteMany({ where: { userId: id } }),
    db.examinerPaper.deleteMany({ where: { examinerId: id } }),
    db.examinerSubject.deleteMany({ where: { examinerId: id } }),
    db.verificationToken.deleteMany({ where: { userId: id } }),
    db.newsletterSubscriber.deleteMany({ where: { userId: id } }),
    db.wallet.deleteMany({ where: { userId: id } }),
    db.user.delete({ where: { id } }),
  ])

  // Best-effort file cleanup
  for (const a of assignments) {
    if (a.uploadedFileKey) {
      try { await deleteObject(a.uploadedFileKey) } catch {}
    }
    if (a.evaluatedFileKey) {
      try { await deleteObject(a.evaluatedFileKey) } catch {}
    }
  }

  return NextResponse.json({ ok: true })
}
