import { getCurrentUser } from '@/lib/server-auth'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { fetchCart, readPromoCookieFromHeaders, fetchActivePromo } from '@/lib/cart'
import { activeGateway } from '@/lib/payments'
import { CartPageClient } from '@/components/cart/cart-page-client'
import { LoginRequired } from '@/components/cart/login-required'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function CartPage() {
  const settings = await getSettings()
  const user = await getCurrentUser()
  if (!user) {
    return <LoginRequired siteName={settings.siteName} />
  }

  const h = await headers()
  const cookieHeader = h.get('cookie')
  const [{ items, totals }, wallet, gateway, promoCookieId] = await Promise.all([
    fetchCart(user.id),
    db.wallet.findUnique({ where: { userId: user.id } }),
    activeGateway(),
    Promise.resolve(readPromoCookieFromHeaders(cookieHeader)),
  ])

  let promo: Awaited<ReturnType<typeof fetchActivePromo>> = null
  if (promoCookieId) {
    promo = await fetchActivePromo(promoCookieId, totals.subtotal)
  }

  const gatewayLabel =
    gateway === 'RAZORPAY' ? 'Razorpay'
    : gateway === 'CASHFREE' ? 'Cashfree'
    : 'Mock gateway (test mode)'

  return (
    <CartPageClient
      user={user}
      items={items}
      totals={totals}
      walletBalance={wallet?.balance ?? 0}
      currencySymbol={settings.currencySymbol}
      gateway={gateway}
      gatewayLabel={gatewayLabel}
      appliedPromo={promo}
    />
  )
}
