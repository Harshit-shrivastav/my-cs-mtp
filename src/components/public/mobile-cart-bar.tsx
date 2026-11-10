// MY CS MTP — Server wrapper for the mobile sticky cart bar.
// The cart is account-based, so the bar only mounts for signed-in users.
// It stays mounted even at 0 items: the client reads the live count
// from CartProvider and shows/hides itself as the cart changes.
import { getCurrentUser } from '@/lib/server-auth'
import { getSettings } from '@/lib/settings'
import { MobileCartBarClient } from './mobile-cart-bar-client'

export async function MobileCartBar() {
  const user = await getCurrentUser()
  if (!user) return null
  const settings = await getSettings()
  return <MobileCartBarClient currencySymbol={settings.currencySymbol || '₹'} />
}
