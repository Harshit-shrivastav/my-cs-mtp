// MY CS MTP — Payment gateway status helpers (shared by admin API + admin page).
// Secrets stay in env vars — only whether they are SET is ever exposed.
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

export function cashfreeConfigured(): boolean {
  return Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY)
}

export type GatewayName = 'RAZORPAY' | 'CASHFREE' | 'MOCK'

/**
 * Same resolution logic as activeGateway() in src/lib/payments.ts:
 * the PaymentGatewayConfig table row wins when it exists, otherwise SiteConfig keys.
 */
export function resolveEffectiveGateway(
  row: { activeGateway: string; razorpayEnabled: boolean; cashfreeEnabled: boolean } | null,
  settings: { activePaymentGateway: string; razorpayEnabled: boolean; cashfreeEnabled: boolean }
): GatewayName {
  const src = row
    ? { gw: row.activeGateway, rz: row.razorpayEnabled, cf: row.cashfreeEnabled }
    : { gw: settings.activePaymentGateway, rz: settings.razorpayEnabled, cf: settings.cashfreeEnabled }
  if (src.gw === 'RAZORPAY' && src.rz && process.env.RAZORPAY_KEY_ID) return 'RAZORPAY'
  if (src.gw === 'CASHFREE' && src.cf && process.env.CASHFREE_APP_ID) return 'CASHFREE'
  return 'MOCK'
}

export interface PaymentGatewayState {
  activePaymentGateway: string
  paymentMode: string
  razorpayEnabled: boolean
  cashfreeEnabled: boolean
  razorpayConfigured: boolean
  cashfreeConfigured: boolean
  effectiveGateway: GatewayName
  hasTableRow: boolean
  tableRowInSync: boolean
}

export async function loadPaymentGatewayState(): Promise<PaymentGatewayState> {
  const [settings, row] = await Promise.all([
    getSettings(),
    db.paymentGatewayConfig.findFirst(),
  ])
  return {
    activePaymentGateway: settings.activePaymentGateway,
    paymentMode: settings.paymentMode,
    razorpayEnabled: settings.razorpayEnabled,
    cashfreeEnabled: settings.cashfreeEnabled,
    razorpayConfigured: razorpayConfigured(),
    cashfreeConfigured: cashfreeConfigured(),
    effectiveGateway: resolveEffectiveGateway(row, settings),
    hasTableRow: !!row,
    tableRowInSync: row
      ? row.activeGateway === settings.activePaymentGateway &&
        row.mode === settings.paymentMode &&
        row.razorpayEnabled === settings.razorpayEnabled &&
        row.cashfreeEnabled === settings.cashfreeEnabled
      : false,
  }
}
