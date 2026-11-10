// MY CS MTP — Admin: plan subjects (GET list + POST add). ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const schema = z.object({
  subjectId: z.string().min(1, 'Subject is required.'),
  originalPrice: z.number().min(0).default(0),
  offerPrice: z.number().min(0).default(0),
  isActive: z.boolean().optional().default(true),
})

export async function GET(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const rows = await db.planSubject.findMany({
    where: { planId: id },
    orderBy: { subject: { sortOrder: 'asc' } },
    select: {
      id: true,
      subjectId: true,
      originalPrice: true,
      offerPrice: true,
      isActive: true,
      subject: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ rows })
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
  const { subjectId, originalPrice, offerPrice, isActive } = parsed.data

  const [plan, subject] = await Promise.all([
    db.plan.findUnique({ where: { id }, select: { id: true, courseId: true } }),
    db.subject.findUnique({ where: { id: subjectId }, select: { id: true, courseId: true } }),
  ])
  if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 })
  if (!subject) return NextResponse.json({ error: 'Subject not found.' }, { status: 404 })
  if (subject.courseId !== plan.courseId) {
    return NextResponse.json({ error: 'Subject must belong to the same course as the plan.' }, { status: 400 })
  }

  const existing = await db.planSubject.findUnique({
    where: { planId_subjectId: { planId: id, subjectId } },
    select: { id: true },
  })
  if (existing) return NextResponse.json({ error: 'Subject already linked to this plan.' }, { status: 400 })

  const ps = await db.planSubject.create({
    data: { planId: id, subjectId, originalPrice, offerPrice, isActive },
    select: { id: true },
  })
  return NextResponse.json({ ok: true, planSubject: ps })
}
