// MY CS MTP — Admin application logs download API. ADMIN-only.
// Serves the tail (~2000 lines) of the log file at env LOG_FILE (default
// "dev.log" in the project cwd) as a text/plain attachment.
import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

const TAIL_LINES = 2000

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  const raw = process.env.LOG_FILE || 'dev.log'
  const filePath = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)

  let content: string
  try {
    content = await fs.readFile(filePath, 'utf8')
  } catch {
    return NextResponse.json(
      { error: `Log file not found at "${raw}" (resolved to ${filePath}).` },
      { status: 404 }
    )
  }

  const lines = content.split('\n')
  const tail = lines.length > TAIL_LINES ? lines.slice(-TAIL_LINES).join('\n') : content

  return new NextResponse(tail, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="mycsmtp-logs.txt"',
      'Cache-Control': 'no-store',
    },
  })
}
