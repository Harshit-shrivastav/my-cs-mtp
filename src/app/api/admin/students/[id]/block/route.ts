// MY CS MTP — Admin: toggle student block status. ADMIN-only.
// Accepts an optional body { block?: boolean } — if undefined, toggles current value.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  // Optional body — `block` may be true/false/undefined.
  let block: boolean | undefined
  try {
    const body = await req.json()
    if (typeof body?.block === 'boolean') block = body.block
  } catch {
    // No body or invalid JSON — treat as undefined (toggle).
  }

  const user = await db.user.findUnique({ where: { id }, select: { id: true, isBlocked: true, role: true } })
  if (!user) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'User is not a student.' }, { status: 400 })

  const nextValue = typeof block === 'boolean' ? block : !user.isBlocked
  const updated = await db.user.update({
    where: { id },
    data: { isBlocked: nextValue },
    select: { id: true, isBlocked: true },
  })

  return NextResponse.json({ ok: true, isBlocked: updated.isBlocked })
}
