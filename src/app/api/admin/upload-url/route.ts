// MY CS MTP — Admin-only presigned upload URL endpoint.
// Returns either a presigned PUT URL (R2 mode) or the local upload endpoint
// path (local mode), along with the mode so the client knows which HTTP
// method/body to use.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { presignedUploadUrl, storageMode, isImageType } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const schema = z.object({
  key: z.string().min(1).max(512),
  contentType: z.string().min(1).max(200),
  imageOnly: z.boolean().optional().default(false),
})

export async function POST(req: Request) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request.' }, { status: 400 })
  }
  const { key, contentType, imageOnly } = parsed.data

  // Reject suspicious paths
  if (key.includes('..') || key.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid key.' }, { status: 400 })
  }

  if (imageOnly && !isImageType(contentType)) {
    return NextResponse.json({ error: 'Only image uploads are allowed here.' }, { status: 400 })
  }

  const url = await presignedUploadUrl(key, contentType)
  return NextResponse.json({ url, key, mode: storageMode === 'r2' ? 'presigned' : 'local' })
}
