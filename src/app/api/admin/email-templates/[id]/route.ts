// MY CS MTP — Admin email template update API. ADMIN-only.
// key is immutable — only subject/body can change.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'

interface RouteCtx {
  params: Promise<{ id: string }>
}

const schema = z.object({
  subject: z.string().trim().min(1, 'Subject is required.').max(300, 'Subject is too long.'),
  body: z.string().trim().min(1, 'Body is required.').max(20000, 'Body is too long.'),
})

export async function PATCH(req: Request, { params }: RouteCtx) {
  const ctx = await requireRole(req, 'ADMIN')
  if (!isAuthCtx(ctx)) return ctx
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  // Reject attempts to change the immutable key.
  if (body && typeof body === 'object' && 'key' in (body as Record<string, unknown>)) {
    return NextResponse.json({ error: 'Template key is immutable and cannot be changed.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input.' },
      { status: 400 }
    )
  }

  const existing = await db.emailTemplate.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Email template not found.' }, { status: 404 })
  }

  const updated = await db.emailTemplate.update({
    where: { id },
    data: { subject: parsed.data.subject, body: parsed.data.body },
  })

  return NextResponse.json({
    ok: true,
    template: { id: updated.id, key: updated.key, subject: updated.subject, updatedAt: updated.updatedAt.toISOString() },
  })
}
