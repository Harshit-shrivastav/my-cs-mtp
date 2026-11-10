// MY CS MTP — Admin misc file detail (PATCH + DELETE). ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  courseId: z.string().min(1).optional(),
  planId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  fileKey: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
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

  const misc = await db.miscFile.findUnique({ where: { id }, select: { id: true, courseId: true } })
  if (!misc) return NextResponse.json({ error: 'File not found.' }, { status: 404 })

  const finalCourseId = data.courseId || misc.courseId
  if (data.planId) {
    const plan = await db.plan.findUnique({ where: { id: data.planId }, select: { id: true, courseId: true } })
    if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 400 })
    if (plan.courseId !== finalCourseId) return NextResponse.json({ error: 'Plan does not belong to the selected course.' }, { status: 400 })
  }
  if (data.subjectId) {
    const subject = await db.subject.findUnique({ where: { id: data.subjectId }, select: { id: true, courseId: true } })
    if (!subject) return NextResponse.json({ error: 'Subject not found.' }, { status: 400 })
    if (subject.courseId !== finalCourseId) return NextResponse.json({ error: 'Subject does not belong to the selected course.' }, { status: 400 })
  }

  const updated = await db.miscFile.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.courseId !== undefined ? { courseId: data.courseId } : {}),
      ...(data.planId !== undefined ? { planId: data.planId } : {}),
      ...(data.subjectId !== undefined ? { subjectId: data.subjectId } : {}),
      ...(data.fileKey !== undefined ? { fileKey: data.fileKey } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    select: { id: true },
  })
  return NextResponse.json({ ok: true, misc: updated })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const misc = await db.miscFile.findUnique({ where: { id }, select: { id: true } })
  if (!misc) return NextResponse.json({ error: 'File not found.' }, { status: 404 })

  await db.miscFile.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
