'use client'

// Live cart count bubbles — read from CartProvider so they update the
// moment the cart changes, without a page reload.
import { useCart } from './cart-context'

// Bubble overlaid on the header cart icon.
export function CartBadgeOverlay() {
  const { count } = useCart()
  if (count <= 0) return null
  return (
    <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-1 flex items-center justify-center">
      {count}
    </span>
  )
}

// Inline bubble used inside the mobile menu's Cart row.
export function CartBadgeInline() {
  const { count } = useCart()
  if (count <= 0) return null
  return (
    <span className="h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-1.5 flex items-center justify-center">
      {count}
    </span>
  )
}
