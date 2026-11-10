// MY CS MTP — Admin: poll the status of a tracked job. ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, c: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await c.params

  const job = await db.job.findUnique({ where: { id } })
  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })

  let result: unknown = null
  if (job.result) {
    try {
      result = JSON.parse(job.result)
    } catch {
      result = job.result
    }
  }

  return NextResponse.json({
    id: job.id,
    type: job.type,
    status: job.status,
    result,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  })
}
