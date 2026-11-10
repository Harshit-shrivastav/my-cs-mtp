import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { recomputeCartLive, validatePromo, PROMO_COOKIE } from '@/lib/cart'

const applySchema = z.object({
  code: z.string().trim().min(1, 'Enter a promo code.'),
})

// POST — apply a promo code (validates against current cart subtotal)
export async function POST(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const parsed = applySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 })
  }
  const { code } = parsed.data

  const { subtotal } = await recomputeCartLive(ctx.user.id)
  if (subtotal <= 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 })
  }

  const result = await validatePromo(code, subtotal)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  const { promo, discount, discountLabel } = result

  const res = NextResponse.json({
    ok: true,
    code: promo.code,
    discount,
    discountLabel,
  })
  // Store the promoCodeId in a cookie so the cart / checkout pages can re-read it.
  res.cookies.set(PROMO_COOKIE, promo.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  })
  return res
}

// DELETE — clear the applied promo cookie
export async function DELETE(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx
  const res = NextResponse.json({ ok: true })
  res.cookies.set(PROMO_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
