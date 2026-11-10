// MY CS MTP — Student mentorship request.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const schema = z.object({
  topic: z.string().trim().min(3, 'Topic must be at least 3 characters.').max(200, 'Topic is too long.'),
  preferredDate: z
    .string()
    .optional()
    .refine((v) => {
      if (!v) return true
      const d = new Date(v)
      return !isNaN(d.getTime()) && d.getTime() > Date.now() - 24 * 60 * 60 * 1000
    }, 'Enter a valid future date.'),
  notes: z.string().trim().max(2000, 'Notes are too long.').optional(),
})

export async function POST(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx
  const userId = ctx.user.id

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

  const { topic, preferredDate, notes } = parsed.data
  const created = await db.mentorship.create({
    data: {
      studentId: userId,
      topic,
      notes: notes || null,
      // preferredDate is stored inside notes if provided (no separate column)
      ...(preferredDate ? { notes: notes ? `Preferred date: ${preferredDate}\n\n${notes}` : `Preferred date: ${preferredDate}` } : {}),
      status: 'REQUESTED',
    },
    select: { id: true, status: true, topic: true },
  })

  return NextResponse.json({ ok: true, mentorship: created })
}

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx
  const userId = ctx.user.id

  const list = await db.mentorship.findMany({
    where: { studentId: userId },
    orderBy: { requestedAt: 'desc' },
    select: {
      id: true,
      topic: true,
      notes: true,
      mentorName: true,
      status: true,
      requestedAt: true,
      updatedAt: true,
    },
  })
  return NextResponse.json({ items: list })
}
