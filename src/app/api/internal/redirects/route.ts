// MY CS MTP — Internal redirects endpoint.
// Returns all rows from the Redirect table as JSON. Used by middleware to
// resolve 301 redirects without instantiating Prisma on the edge runtime.
// Excluded from the middleware matcher so it's safe to call from middleware.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await db.redirect.findMany({
      select: { fromPath: true, toPath: true, isPermanent: true },
    })
    return NextResponse.json({ rows })
  } catch (e) {
    console.error('internal/redirects failed', e)
    return NextResponse.json({ rows: [] }, { status: 200 })
  }
}
