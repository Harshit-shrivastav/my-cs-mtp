// MY CS MTP — shared promo-code validation helpers (used by admin promo API routes).
import { z } from 'zod'

export const promoSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required.')
    .max(40, 'Code must be 40 characters or fewer.')
    .transform((s) => s.toUpperCase().replace(/\s+/g, '')),
  type: z.enum(['PERCENT', 'FLAT']),
  value: z.number().positive('Value must be greater than 0.'),
  minAmount: z.number().min(0).nullable().optional(),
  maxDiscount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int('Usage limit must be a whole number.').min(0).nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  isActive: z.boolean().nullable().optional(),
})

export type PromoInput = z.infer<typeof promoSchema>

/** Business-rule checks beyond shape validation. Returns an error message or null. */
export function validatePromoRules(d: PromoInput): string | null {
  if (d.type === 'PERCENT' && d.value > 100) {
    return 'Percent value must be between 1 and 100.'
  }
  if (d.startsAt && Number.isNaN(new Date(d.startsAt).getTime())) return 'Invalid start date.'
  if (d.endsAt && Number.isNaN(new Date(d.endsAt).getTime())) return 'Invalid end date.'
  if (d.startsAt && d.endsAt && new Date(d.endsAt) <= new Date(d.startsAt)) {
    return 'End date must be after start date.'
  }
  return null
}

/** Map nullable optional fields to concrete Prisma values. */
export function promoData(d: PromoInput) {
  return {
    code: d.code,
    type: d.type,
    value: d.value,
    minAmount: d.minAmount ?? 0,
    maxDiscount: d.maxDiscount ?? 0,
    usageLimit: d.usageLimit ?? 0,
    startsAt: d.startsAt ? new Date(d.startsAt) : null,
    endsAt: d.endsAt ? new Date(d.endsAt) : null,
    isActive: d.isActive ?? true,
  }
}
