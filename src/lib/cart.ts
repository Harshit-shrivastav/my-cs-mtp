// MY CS MTP — Cart helpers shared between API routes and SSR pages.
// Computes totals from live DB prices (NEVER trust client-sent prices).
import { db } from '@/lib/db'

export interface CartLineItem {
  id: string
  planId: string
  planName: string
  planSubjectId: string
  subjectId: string
  subjectName: string
  courseId: string
  courseName: string
  priceSnapshot: number
  originalPriceSnapshot: number
}

export interface CartTotals {
  subtotal: number
  original: number
}

export const PROMO_COOKIE = 'mtp_promo'

export interface AppliedPromo {
  promoCodeId: string
  code: string
  type: 'PERCENT' | 'FLAT'
  value: number
  minAmount: number
  maxDiscount: number
  discount: number
  discountLabel: string
}

// Fetch the user's cart with live subject/plan/course data joined
export async function fetchCart(userId: string): Promise<{ items: CartLineItem[]; totals: CartTotals }> {
  const rows = await db.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      planSubject: {
        include: {
          plan: { include: { course: true } },
          subject: true,
        },
      },
    },
  })

  const items: CartLineItem[] = rows.map((r) => ({
    id: r.id,
    planId: r.planId,
    planName: r.planSubject.plan.name,
    planSubjectId: r.planSubjectId,
    subjectId: r.subjectId,
    subjectName: r.planSubject.subject.name,
    courseId: r.planSubject.plan.course.id,
    courseName: r.planSubject.plan.course.name,
    priceSnapshot: r.priceSnapshot,
    originalPriceSnapshot: r.originalPriceSnapshot,
  }))

  const totals = items.reduce<CartTotals>(
    (acc, it) => {
      acc.subtotal += it.priceSnapshot
      acc.original += it.originalPriceSnapshot
      return acc
    },
    { subtotal: 0, original: 0 }
  )

  return { items, totals }
}

// Recompute the cart subtotal from LIVE PlanSubject prices.
// Used at checkout time so a price change between add-to-cart and pay is honoured.
export async function recomputeCartLive(userId: string): Promise<{
  items: Array<{
    cartItemId: string
    planSubjectId: string
    planId: string
    subjectId: string
    livePrice: number
    liveOriginal: number
  }>
  subtotal: number
  original: number
}> {
  const rows = await db.cartItem.findMany({
    where: { userId },
    include: {
      planSubject: true,
    },
  })

  const items = rows.map((r) => ({
    cartItemId: r.id,
    planSubjectId: r.planSubjectId,
    planId: r.planId,
    subjectId: r.subjectId,
    livePrice: r.planSubject.offerPrice,
    liveOriginal: r.planSubject.originalPrice,
  }))

  const subtotal = items.reduce((acc, it) => acc + it.livePrice, 0)
  const original = items.reduce((acc, it) => acc + it.liveOriginal, 0)

  return { items, subtotal, original }
}

// ---- Promo cookie helpers ----

export function readPromoCookie(req: Request): string | null {
  const cookie = req.headers.get('cookie') || ''
  return readPromoCookieFromHeaders(cookie)
}

export function readPromoCookieFromHeaders(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const [k, v] = part.trim().split('=')
    if (k === PROMO_COOKIE && v) return decodeURIComponent(v)
  }
  return null
}

// Look up the promo by code and validate against cart subtotal.
// Returns null if invalid. Otherwise computes the discount.
export async function validatePromo(
  code: string,
  subtotal: number
): Promise<{ promo: NonNullable<Awaited<ReturnType<typeof db.promoCode.findFirst>>>; discount: number; discountLabel: string } | { error: string }> {
  const promo = await db.promoCode.findFirst({
    where: {
      code: code.trim().toUpperCase(),
      isActive: true,
    },
  })
  if (!promo) return { error: 'Invalid promo code.' }
  const now = new Date()
  if (promo.startsAt && promo.startsAt > now) return { error: 'Promo not yet active.' }
  if (promo.endsAt && promo.endsAt < now) return { error: 'Promo expired.' }
  if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
    return { error: 'Promo usage limit reached.' }
  }
  if (subtotal < promo.minAmount) {
    return { error: `Minimum cart total of ₹${promo.minAmount.toFixed(2)} required for this promo.` }
  }

  let discount = 0
  let discountLabel = ''
  if (promo.type === 'PERCENT') {
    discount = (subtotal * promo.value) / 100
    if (promo.maxDiscount > 0 && discount > promo.maxDiscount) discount = promo.maxDiscount
    discountLabel = `${promo.value}% off`
  } else {
    discount = promo.value
    if (discount > subtotal) discount = subtotal
    discountLabel = `₹${promo.value.toFixed(2)} off`
  }
  return { promo, discount, discountLabel }
}

// Fetch a promo by ID (already-applied cookie). Re-validates expiry/usage/minAmount.
export async function fetchActivePromo(
  promoCodeId: string,
  subtotal: number
): Promise<AppliedPromo | null> {
  const promo = await db.promoCode.findUnique({ where: { id: promoCodeId } })
  if (!promo || !promo.isActive) return null
  const now = new Date()
  if (promo.startsAt && promo.startsAt > now) return null
  if (promo.endsAt && promo.endsAt < now) return null
  if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) return null
  if (subtotal < promo.minAmount) return null

  let discount = 0
  let discountLabel = ''
  if (promo.type === 'PERCENT') {
    discount = (subtotal * promo.value) / 100
    if (promo.maxDiscount > 0 && discount > promo.maxDiscount) discount = promo.maxDiscount
    discountLabel = `${promo.value}% off`
  } else {
    discount = promo.value
    if (discount > subtotal) discount = subtotal
    discountLabel = `₹${promo.value.toFixed(2)} off`
  }

  return {
    promoCodeId: promo.id,
    code: promo.code,
    type: promo.type,
    value: promo.value,
    minAmount: promo.minAmount,
    maxDiscount: promo.maxDiscount,
    discount,
    discountLabel,
  }
}
