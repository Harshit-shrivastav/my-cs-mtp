import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

// POST — clear current user's cart
export async function POST(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx
  await db.cartItem.deleteMany({ where: { userId: ctx.user.id } })
  return NextResponse.json({ ok: true, count: 0 })
}
