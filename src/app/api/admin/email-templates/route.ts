// MY CS MTP — Admin email templates list API. ADMIN-only.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const rows = await db.emailTemplate.findMany({ orderBy: { key: 'asc' } })
  return NextResponse.json({ rows })
}
