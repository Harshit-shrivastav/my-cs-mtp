// MY CS MTP — Admin wallet list + ensure-wallet API. ADMIN-only.
// GET lists STUDENT users with their wallet balance (0 when no wallet row yet).
// POST { userId } creates (or returns) the wallet for a student.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim()
  const pageRaw = parseInt(u.searchParams.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSizeRaw = parseInt(u.searchParams.get('pageSize') || '10', 10)
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 && pageSizeRaw <= 100 ? pageSizeRaw : 10

  const where = {
    role: 'STUDENT' as const,
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
  }

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        isBlocked: true,
        createdAt: true,
        wallet: {
          select: {
            id: true,
            balance: true,
            updatedAt: true,
            _count: { select: { transactions: true } },
          },
        },
      },
    }),
  ])

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    rows: users.map((usr) => ({
      userId: usr.id,
      name: usr.name,
      email: usr.email,
      isBlocked: usr.isBlocked,
      walletId: usr.wallet?.id ?? null,
      balance: usr.wallet?.balance ?? 0,
      txCount: usr.wallet?._count.transactions ?? 0,
      walletUpdatedAt: usr.wallet?.updatedAt ?? null,
    })),
  })
}

const ensureSchema = z.object({
  userId: z.string().min(1, 'userId is required.'),
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
  const parsed = ensureSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }

  const user = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true },
  })
  if (!user) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'User is not a student.' }, { status: 400 })

  const wallet = await db.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, balance: 0 },
    select: { id: true, userId: true, balance: true },
  })

  return NextResponse.json({ ok: true, wallet })
}
