// MY CS MTP — Admin: assign examiner to an assignment. ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const schema = z.object({
  examinerId: z.string().min(1, 'Examiner is required.'),
})

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
  const { examinerId } = parsed.data

  const [assignment, examiner] = await Promise.all([
    db.assignment.findUnique({ where: { id }, select: { id: true } }),
    db.user.findUnique({
      where: { id: examinerId },
      select: { id: true, role: true },
    }),
  ])
  if (!assignment) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 })
  if (!examiner) return NextResponse.json({ error: 'Examiner not found.' }, { status: 400 })
  if (examiner.role !== 'EXAMINER') return NextResponse.json({ error: 'User is not an examiner.' }, { status: 400 })

  const updated = await db.assignment.update({
    where: { id },
    data: {
      examinerId,
      status: 'ASSIGNED',
    },
    select: { id: true, status: true, examinerId: true },
  })
  return NextResponse.json({ ok: true, assignment: updated })
}
