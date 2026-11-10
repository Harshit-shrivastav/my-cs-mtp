// MY CS MTP — /favicon.ico fallback route.
// Modern browsers use /favicon.svg (referenced by the metadata icons in layout.tsx).
// For older browsers that still hit /favicon.ico, we serve the SVG bytes with the
// image/svg+xml content-type. The favicon SVG lives in /public/favicon.svg.
import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-static'
export const revalidate = 86400 // daily

export async function GET() {
  try {
    const file = path.join(process.cwd(), 'public', 'favicon.svg')
    const buf = await fs.readFile(file)
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
