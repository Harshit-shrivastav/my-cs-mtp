// MY CS MTP — Admin leads CSV export. ADMIN-only.
// Streams all leads as a downloadable CSV attachment.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { rowToCsv } from '@/lib/utils-extra'

export const dynamic = 'force-dynamic'

const HEADERS = ['Name', 'Email', 'Mobile', 'Course Interest', 'Source', 'Message', 'Created At']
const MAX_EXPORT = 10_000

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') || '').trim()
  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { mobile: { contains: q } },
        ],
      }
    : {}

  const leads = await db.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: MAX_EXPORT,
  })

  const rows = leads.map((l) => ({
    Name: l.name ?? '',
    Email: l.email ?? '',
    Mobile: l.mobile ?? '',
    'Course Interest': l.courseInterest ?? '',
    Source: l.source ?? '',
    Message: l.message ?? '',
    'Created At': l.createdAt.toISOString(),
  }))

  // rowToCsv derives headers from the first row — emit the header line even
  // when there are no leads so the file is never empty.
  const csv = rows.length > 0 ? rowToCsv(rows) : HEADERS.join(',')

  const stamp = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
