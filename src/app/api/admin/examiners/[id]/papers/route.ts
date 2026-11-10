// MY CS MTP — Admin: assign/unassign papers to an examiner.
// ADMIN-only. POST { paperId } to assign, DELETE ?paperId= to unassign.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const assignSchema = z.object({
  paperId: z.string().trim().min(1, 'Paper is required.'),
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

  const paper = await db.testPaper.findUnique({
    where: { id: parsed.data.paperId },
    select: { id: true, title: true },
  })
  if (!paper) return NextResponse.json({ error: 'Paper not found.' }, { status: 404 })

  const created = await db.examinerPaper.upsert({
    where: { examinerId_paperId: { examinerId: id, paperId: paper.id } },
    create: { examinerId: id, paperId: paper.id },
    update: {},
    select: { id: true },
  })

  return NextResponse.json({ ok: true, examinerPaper: created })
}

export async function DELETE(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const paperId = new URL(req.url).searchParams.get('paperId')
  if (!paperId) {
    return NextResponse.json({ error: 'paperId query parameter is required.' }, { status: 400 })
  }

  const examiner = await findExaminer(id)
  if (!examiner) return NextResponse.json({ error: 'Examiner not found.' }, { status: 404 })

  const res = await db.examinerPaper.deleteMany({ where: { examinerId: id, paperId } })
  if (res.count === 0) {
    return NextResponse.json({ error: 'This paper is not assigned to the examiner.' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
