// MY CS MTP — Admin mentorship PATCH. ADMIN-only.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['REQUESTED', 'ASSIGNED', 'COMPLETED', 'CANCELLED'] as const

const schema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  mentorName: z.string().nullable().optional(),
  remarks: z.string().optional(),
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

  const m = await db.mentorship.findUnique({ where: { id }, select: { id: true } })
  if (!m) return NextResponse.json({ error: 'Request not found.' }, { status: 404 })

  const updated = await db.mentorship.update({
    where: { id },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.mentorName !== undefined ? { mentorName: data.mentorName } : {}),
      ...(data.remarks !== undefined ? { notes: data.remarks } : {}),
    },
    select: { id: true, status: true, mentorName: true, notes: true },
  })
  return NextResponse.json({ ok: true, mentorship: updated })
}
