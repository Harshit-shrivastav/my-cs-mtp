// MY CS MTP — Admin: adjust a wallet (credit / debit). ADMIN-only.
// Transaction: updates balance (DEBIT never goes below 0) + creates a WalletTransaction.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const schema = z.object({
  type: z.enum(['CREDIT', 'DEBIT']),
  amount: z.number().positive('Amount must be greater than 0.'),
  reason: z.string().trim().min(1, 'Reason is required.').max(200, 'Reason must be 200 characters or fewer.'),
  reference: z.string().max(100).nullable().optional(),
})

/** Error carrying an HTTP status through the interactive transaction. */
class HttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

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
  const { type, amount, reason, reference } = parsed.data

  try {
    const result = await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { id },
        select: { id: true, userId: true, balance: true },
      })
      if (!wallet) throw new HttpError('Wallet not found.', 404)

      if (type === 'DEBIT' && wallet.balance < amount) {
        throw new HttpError(
          `Insufficient balance — wallet has ₹${wallet.balance.toFixed(2)} but you tried to debit ₹${amount.toFixed(2)}.`,
          400
        )
      }

      const updated = await tx.wallet.update({
        where: { id },
        data: {
          balance: type === 'CREDIT' ? { increment: amount } : { decrement: amount },
        },
        select: { id: true, balance: true },
      })

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: wallet.userId,
          amount,
          type,
          reason,
          reference: reference || null,
        },
        select: { id: true, amount: true, type: true, reason: true, createdAt: true },
      })

      return { wallet: updated, transaction }
    })

    return NextResponse.json({ ok: true, balance: result.wallet.balance, transaction: result.transaction })
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'Failed to adjust wallet.' }, { status: 500 })
  }
}
