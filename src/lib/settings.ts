// MY CS MTP — Settings service.
// Reads all site settings from the database with a short in-memory cache.
// Falls back to built-in defaults when a key is missing.

import { db } from '@/lib/db'

export interface SiteSettings {
  siteName: string
  tagline: string
  logoKey: string | null
  faviconKey: string | null
  ogImageKey: string | null
  themeColor: string
  supportEmail: string
  supportPhone: string
  whatsappNumber: string
  whatsappLink: string
  address: string
  facebook: string
  instagram: string
  twitter: string
  youtube: string
  currencySymbol: string
  subjectsBeforeViewMore: number
  assignmentUploadEnabled: boolean
  assignmentUploadDisabledMessage: string
  freeContentEnabled: boolean
  twoFactorEnabled: boolean
  evaluationPromiseText: string
  promoWalletAmount: number
  promoWalletRules: string
  googleAnalyticsId: string
  referralRewardType: string
  referralRewardValue: number
  referralRules: string
  salePopupEnabled: boolean
  salePopupTitle: string
  salePopupText: string
  salePopupImageKey: string | null
  salePopupDelaySeconds: number
  salePopupFrequency: string
  activePaymentGateway: string
  paymentMode: string
  razorpayEnabled: boolean
  cashfreeEnabled: boolean
}

const DEFAULTS: SiteSettings = {
  siteName: 'MY CS MTP',
  tagline: 'Online test series for CS students — CSEET, Executive & Professional',
  logoKey: null,
  faviconKey: null,
  ogImageKey: null,
  themeColor: '#000000',
  supportEmail: 'support@mycsmtp.com',
  supportPhone: '+91 90000 00000',
  whatsappNumber: '919000000000',
  whatsappLink: 'https://wa.me/919000000000',
  address: 'India',
  facebook: '',
  instagram: '',
  twitter: '',
  youtube: '',
  currencySymbol: '₹',
  subjectsBeforeViewMore: 4,
  assignmentUploadEnabled: true,
  assignmentUploadDisabledMessage: 'Assignment uploads are temporarily disabled. Please try again later.',
  freeContentEnabled: true,
  twoFactorEnabled: true,
  evaluationPromiseText: 'Evaluated copies are typically returned within 5–7 working days.',
  promoWalletAmount: 50,
  promoWalletRules: 'Promotional wallet credit is added to your wallet on signup and is non-refundable.',
  googleAnalyticsId: '',
  referralRewardType: 'WALLET',
  referralRewardValue: 50,
  referralRules: 'Refer a friend. When they make their first purchase, both of you get ₹50 in your wallet.',
  salePopupEnabled: false,
  salePopupTitle: 'Special Offer!',
  salePopupText: 'Use code WELCOME10 for 10% off on your first test series.',
  salePopupImageKey: null,
  salePopupDelaySeconds: 5,
  salePopupFrequency: 'ONCE_PER_SESSION',
  activePaymentGateway: 'MOCK',
  paymentMode: 'SANDBOX',
  razorpayEnabled: false,
  cashfreeEnabled: false,
}

const KEY_MAP: Record<keyof SiteSettings, string> = {
  siteName: 'site_name',
  tagline: 'site_tagline',
  logoKey: 'site_logo_key',
  faviconKey: 'site_favicon_key',
  ogImageKey: 'site_og_image_key',
  themeColor: 'site_theme_color',
  supportEmail: 'contact_email',
  supportPhone: 'contact_phone',
  whatsappNumber: 'whatsapp_number',
  whatsappLink: 'whatsapp_link',
  address: 'contact_address',
  facebook: 'social_facebook',
  instagram: 'social_instagram',
  twitter: 'social_twitter',
  youtube: 'social_youtube',
  currencySymbol: 'currency_symbol',
  subjectsBeforeViewMore: 'subjects_before_view_more',
  assignmentUploadEnabled: 'assignment_upload_enabled',
  assignmentUploadDisabledMessage: 'assignment_upload_disabled_message',
  freeContentEnabled: 'free_content_enabled',
  twoFactorEnabled: 'two_factor_enabled',
  evaluationPromiseText: 'evaluation_promise_text',
  promoWalletAmount: 'promo_wallet_amount',
  promoWalletRules: 'promo_wallet_rules',
  googleAnalyticsId: 'google_analytics_id',
  referralRewardType: 'referral_reward_type',
  referralRewardValue: 'referral_reward_value',
  referralRules: 'referral_rules',
  salePopupEnabled: 'sale_popup_enabled',
  salePopupTitle: 'sale_popup_title',
  salePopupText: 'sale_popup_text',
  salePopupImageKey: 'sale_popup_image_key',
  salePopupDelaySeconds: 'sale_popup_delay_seconds',
  salePopupFrequency: 'sale_popup_frequency',
  activePaymentGateway: 'active_payment_gateway',
  paymentMode: 'payment_mode',
  razorpayEnabled: 'razorpay_enabled',
  cashfreeEnabled: 'cashfree_enabled',
}

const REVERSE_MAP: Record<string, keyof SiteSettings> = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k as keyof SiteSettings])
)

function coerce(key: keyof SiteSettings, raw: string | null): string | number | boolean | null {
  if (raw === null) return DEFAULTS[key]
  switch (key) {
    case 'subjectsBeforeViewMore':
    case 'salePopupDelaySeconds':
    case 'promoWalletAmount':
    case 'referralRewardValue':
      return parseInt(raw, 10) || (DEFAULTS[key] as number)
    case 'assignmentUploadEnabled':
    case 'freeContentEnabled':
    case 'twoFactorEnabled':
    case 'salePopupEnabled':
    case 'razorpayEnabled':
    case 'cashfreeEnabled':
      return raw === 'true' || raw === '1'
    default:
      return raw
  }
}

let cache: { data: SiteSettings; at: number } | null = null
const TTL = 30_000 // 30 seconds

export async function getSettings(opts: { force?: boolean } = {}): Promise<SiteSettings> {
  if (cache && !opts.force && Date.now() - cache.at < TTL) return cache.data
  const rows = await db.siteConfig.findMany()
  const map = new Map(rows.map((r) => [r.key, r.value]))
  const out = { ...DEFAULTS }
  for (const key of Object.keys(DEFAULTS) as (keyof SiteSettings)[]) {
    const dbKey = KEY_MAP[key]
    const raw = map.get(dbKey) ?? null
    const v = coerce(key, raw)
    ;(out as any)[key] = v
  }
  cache = { data: out, at: Date.now() }
  return out
}

export async function setSetting(key: keyof SiteSettings, value: string): Promise<void> {
  const dbKey = KEY_MAP[key]
  if (!dbKey) throw new Error('Unknown setting: ' + key)
  await db.siteConfig.upsert({
    where: { key: dbKey },
    update: { value },
    create: { key: dbKey, value },
  })
  cache = null
}

export async function setSettingFromInput(key: string, value: string): Promise<void> {
  if (REVERSE_MAP[key]) {
    await setSetting(REVERSE_MAP[key], value)
  } else {
    // unknown key — still persist so admin doesn't lose data
    await db.siteConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
    cache = null
  }
}

export function settingsKeyList(): { key: string; label: string; group: string }[] {
  return Object.entries(KEY_MAP).map(([settingKey, dbKey]) => ({
    key: dbKey,
    label: settingKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
    group: settingGroup(settingKey as keyof SiteSettings),
  }))
}

function settingGroup(k: keyof SiteSettings): string {
  const groups: Record<string, string[]> = {
    Identity: ['siteName', 'tagline', 'logoKey', 'faviconKey', 'ogImageKey', 'themeColor'],
    Contact: ['supportEmail', 'supportPhone', 'whatsappNumber', 'whatsappLink', 'address'],
    Social: ['facebook', 'instagram', 'twitter', 'youtube'],
    Catalogue: ['currencySymbol', 'subjectsBeforeViewMore'],
    'Assignment & Evaluation': ['assignmentUploadEnabled', 'assignmentUploadDisabledMessage', 'evaluationPromiseText'],
    'Free Content': ['freeContentEnabled'],
    'Two-Factor Auth': ['twoFactorEnabled'],
    Referral: ['referralRewardType', 'referralRewardValue', 'referralRules'],
    'Promotional Wallet': ['promoWalletAmount', 'promoWalletRules'],
    'Sale Popup': ['salePopupEnabled', 'salePopupTitle', 'salePopupText', 'salePopupImageKey', 'salePopupDelaySeconds', 'salePopupFrequency'],
    'Payment Gateway': ['activePaymentGateway', 'paymentMode', 'razorpayEnabled', 'cashfreeEnabled'],
    Analytics: ['googleAnalyticsId'],
  }
  for (const [g, keys] of Object.entries(groups)) if (keys.includes(k)) return g
  return 'Other'
}

export async function getAllRawSettings(): Promise<{ key: string; value: string | null }[]> {
  return db.siteConfig.findMany({ orderBy: { key: 'asc' } })
}
