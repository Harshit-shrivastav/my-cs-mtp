import { PublicHeader } from '@/components/public/header'
import { PublicFooter } from '@/components/public/footer'
import { MobileCartBar } from '@/components/public/mobile-cart-bar'
import { LeadPopup } from '@/components/public/lead-popup'
import { CartProvider } from '@/components/cart/cart-context'
import { getSettings } from '@/lib/settings'
import { getCurrentUser } from '@/lib/server-auth'
import { recomputeCartLive } from '@/lib/cart'
import { Suspense } from 'react'

export async function PublicLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings()
  const popup = {
    enabled: s.salePopupEnabled,
    title: s.salePopupTitle,
    text: s.salePopupText,
    imageKey: s.salePopupImageKey,
    delaySeconds: s.salePopupDelaySeconds,
    frequency: s.salePopupFrequency,
  }

  // Initial cart state for the live header badge + mobile bottom bar.
  const user = await getCurrentUser()
  let cartCount = 0
  let cartTotal = 0
  if (user) {
    const live = await recomputeCartLive(user.id)
    cartCount = live.items.length
    cartTotal = live.subtotal
  }

  return (
    <CartProvider initialCount={cartCount} initialTotal={cartTotal}>
      <PublicHeader />
      <main className="flex-1 flex flex-col">{children}</main>
      <PublicFooter />
      <MobileCartBar />
      <Suspense fallback={null}>
        <LeadPopup popup={popup} />
      </Suspense>
    </CartProvider>
  )
}
