// MY CS MTP — Admin: assign/unassign subjects to an examiner.
// ADMIN-only. POST { subjectId } to assign, DELETE ?subjectId= to unassign.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const assignSchema = z.object({
  subjectId: z.string().trim().min(1, 'Subject is required.'),
})

async function findExaminer(id: string) {
  return db.user.findFirst({ where: { id, role: 'EXAMINER' }, select: { id: true, name: true } })
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
  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input.' },
      { status: 400 }
    )
  }

  const examiner = await findExaminer(id)
  if (!examiner) return NextResponse.json({ error: 'Examiner not found.' }, { status: 404 })

  const subject = await db.subject.findUnique({
    where: { id: parsed.data.subjectId },
    select: { id: true, name: true },
  })
  if (!subject) return NextResponse.json({ error: 'Subject not found.' }, { status: 404 })

  const created = await db.examinerSubject.upsert({
    where: { examinerId_subjectId: { examinerId: id, subjectId: subject.id } },
    create: { examinerId: id, subjectId: subject.id },
    update: {},
    select: { id: true },
  })

  return NextResponse.json({ ok: true, examinerSubject: created })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const subjectId = new URL(req.url).searchParams.get('subjectId')
  if (!subjectId) {
    return NextResponse.json({ error: 'subjectId query parameter is required.' }, { status: 400 })
  }

  const examiner = await findExaminer(id)
  if (!examiner) return NextResponse.json({ error: 'Examiner not found.' }, { status: 404 })

  const res = await db.examinerSubject.deleteMany({ where: { examinerId: id, subjectId } })
  if (res.count === 0) {
    return NextResponse.json({ error: 'This subject is not assigned to the examiner.' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
