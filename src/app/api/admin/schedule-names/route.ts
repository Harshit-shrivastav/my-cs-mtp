// MY CS MTP — Admin schedule names CRUD API. ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const schema = z.object({
  name: z.string().min(1, 'Name is required.'),
  planId: z.string().min(1, 'Plan is required.'),
  sortOrder: z.number().int().min(0).optional().default(0),
})

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const rows = await db.scheduleName.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      planId: true,
      sortOrder: true,
      plan: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ rows })
}

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
  const data = parsed.data

  const plan = await db.plan.findUnique({ where: { id: data.planId }, select: { id: true } })
  if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 400 })

  const sn = await db.scheduleName.create({
    data: { name: data.name, planId: data.planId, sortOrder: data.sortOrder },
    select: { id: true },
  })
  return NextResponse.json({ ok: true, scheduleName: sn })
}
