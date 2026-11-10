// MY CS MTP — Admin schedule detail (PATCH + DELETE). ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  planId: z.string().min(1).optional(),
  courseId: z.string().min(1).optional(),
  scheduleNameId: z.string().nullable().optional(),
  fileKey: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  publishedAt: z.string().nullable().optional(),
})

export async function PATCH(req: Request, c: { params: Promise<{ id: string }> }) {
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
  const data = parsed.data

  const s = await db.schedule.findUnique({ where: { id }, select: { id: true, planId: true, courseId: true } })
  if (!s) return NextResponse.json({ error: 'Schedule not found.' }, { status: 404 })

  const finalPlanId = data.planId || s.planId
  const finalCourseId = data.courseId || s.courseId

  if (data.planId !== undefined || data.courseId !== undefined) {
    const plan = await db.plan.findUnique({ where: { id: finalPlanId }, select: { id: true, courseId: true } })
    if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 400 })
    if (plan.courseId !== finalCourseId) return NextResponse.json({ error: 'Plan does not belong to the selected course.' }, { status: 400 })
  }

  if (data.scheduleNameId) {
    const sn = await db.scheduleName.findUnique({ where: { id: data.scheduleNameId }, select: { id: true, planId: true } })
    if (!sn) return NextResponse.json({ error: 'Schedule name not found.' }, { status: 400 })
    if (sn.planId !== finalPlanId) return NextResponse.json({ error: 'Schedule name does not belong to the selected plan.' }, { status: 400 })
  }

  const updated = await db.schedule.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.planId !== undefined ? { planId: data.planId } : {}),
      ...(data.courseId !== undefined ? { courseId: data.courseId } : {}),
      ...(data.scheduleNameId !== undefined ? { scheduleNameId: data.scheduleNameId } : {}),
      ...(data.fileKey !== undefined ? { fileKey: data.fileKey } : {}),
      ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
      ...(data.publishedAt !== undefined ? { publishedAt: data.publishedAt ? new Date(data.publishedAt) : null } : {}),
    },
    select: { id: true },
  })
  return NextResponse.json({ ok: true, schedule: updated })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const s = await db.schedule.findUnique({ where: { id }, select: { id: true } })
  if (!s) return NextResponse.json({ error: 'Schedule not found.' }, { status: 404 })

  await db.schedule.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
