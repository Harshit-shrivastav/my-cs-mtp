// MY CS MTP — Admin: revoke ALL purchases for a student. ADMIN-only.
// Provided as a separate endpoint per the spec for the "Revoke all purchases" button.
// SECURITY: requires the ADMIN's own password (re-confirmed server-side) and
// runs as a tracked Job the admin can poll via GET /api/admin/jobs/[id].
import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { runTrackedJob } from '@/lib/admin-jobs'

export const dynamic = 'force-dynamic'

const schema = z.object({
  adminPassword: z.string().min(1, 'Admin password is required.'),
})

export async function POST(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }

  // Re-confirm the requesting admin's password server-side.
  const admin = await db.user.findUnique({ where: { id: ctx.user.id }, select: { passwordHash: true } })
  if (!admin) return NextResponse.json({ error: 'Admin account not found.' }, { status: 401 })
  const ok = await bcrypt.compare(parsed.data.adminPassword, admin.passwordHash)
  if (!ok) return NextResponse.json({ error: 'Incorrect admin password.' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id }, select: { id: true, role: true, email: true } })
  if (!user) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'User is not a student.' }, { status: 400 })

  const jobId = await runTrackedJob(
    'REVOKE_ALL_PURCHASES',
    { studentId: id },
    ctx.user.id,
    async () => {
      const result = await db.purchase.updateMany({
        where: { userId: id },
        data: { isRevoked: true, revokedAt: new Date() },
      })
      return { revokedCount: result.count, studentEmail: user.email }
    }
  )

  return NextResponse.json({ ok: true, jobId })
}
