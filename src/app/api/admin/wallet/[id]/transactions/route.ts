// MY CS MTP — Admin: wallet transactions list. ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const u = new URL(req.url)
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSizeRaw = parseInt(u.searchParams.get('pageSize') || '50', 10)
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 && pageSizeRaw <= 200 ? pageSizeRaw : 50

  const wallet = await db.wallet.findUnique({
    where: { id },
    select: {
      id: true,
      balance: true,
      user: { select: { id: true, name: true, email: true } },
    },
  })
  if (!wallet) return NextResponse.json({ error: 'Wallet not found.' }, { status: 404 })

  const [total, transactions] = await Promise.all([
    db.walletTransaction.count({ where: { walletId: id } }),
    db.walletTransaction.findMany({
      where: { walletId: id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        amount: true,
        type: true,
        reason: true,
        reference: true,
        createdAt: true,
      },
    }),
  ])

  return NextResponse.json({
    wallet,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    transactions,
  })
}
