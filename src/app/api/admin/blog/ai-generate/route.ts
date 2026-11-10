// MY CS MTP — Admin blog AI draft generation. ADMIN-only.
// Reads the OpenAI-compatible AiConfig row and generates a full markdown
// draft from a title. The apiKey is NEVER included in any response.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'

export const dynamic = 'force-dynamic'
export const maxDuration = 90

const schema = z.object({
  title: z.string().trim().min(1, 'Enter a title to generate a draft for.').max(300),
})

const TIMEOUT_MS = 60_000

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
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }
  const { title } = parsed.data

  // ---- AI config gate ----
  // Prefer the active row; fall back to the most recently updated one so the
  // "not configured / inactive" message still fires for a disabled config.
  const aiConfig =
    (await db.aiConfig.findFirst({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } })) ??
    (await db.aiConfig.findFirst({ orderBy: { updatedAt: 'desc' } }))

  if (!aiConfig || !aiConfig.isActive || !aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.model) {
    return NextResponse.json(
      { error: 'AI is not configured. Set it up in Admin → AI Config first.' },
      { status: 400 }
    )
  }

  // ---- Call the OpenAI-compatible chat completions endpoint ----
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let content: string | undefined
  try {
    const url = `${aiConfig.baseUrl.replace(/\/$/, '')}/chat/completions`
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aiConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a blog writer for MY CS MTP, an Indian CS (Company Secretary) test-series platform. Write practical, helpful blog posts in markdown with ## headings.',
          },
          {
            role: 'user',
            content: `Write a complete blog post in markdown (700–1000 words) titled: "${title}". Include an intro, ## sections, and a short conclusion.`,
          },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    })

    if (!r.ok) {
      let detail = ''
      try {
        const j = await r.json()
        detail = j?.error?.message || j?.error || j?.message || ''
        if (typeof detail !== 'string') detail = JSON.stringify(detail)
      } catch {
        detail = ''
      }
      return NextResponse.json(
        { error: `AI provider error (HTTP ${r.status})${detail ? `: ${detail.slice(0, 300)}` : '.'}` },
        { status: 502 }
      )
    }

    const data = await r.json()
    content = data?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'The AI returned an empty response. Try again.' }, { status: 502 })
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return NextResponse.json({ error: 'AI request timed out after 60 seconds. Try again.' }, { status: 504 })
    }
    console.error('blog ai-generate failed', e)
    return NextResponse.json({ error: 'Could not reach the AI provider. Check the AI Config settings.' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }

  // Best-effort excerpt: first non-heading paragraph, trimmed to ~220 chars.
  const excerpt = deriveExcerpt(content)

  return NextResponse.json({ ok: true, content, excerpt: excerpt || undefined })
}

function deriveExcerpt(markdown: string): string {
  const lines = markdown.split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('![') || line.startsWith('|')) continue
    const text = line
      .replace(/\*\*|__|`|\[|\]\([^)]*\)|\*/g, '')
      .trim()
    if (text.length < 20) continue
    return text.length > 220 ? text.slice(0, 217).replace(/\s+\S*$/, '') + '…' : text
  }
  return ''
}
