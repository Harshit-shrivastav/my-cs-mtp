'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ShoppingCart } from 'lucide-react'
import { useCart } from '@/components/cart/cart-context'

// Sticky bottom "Buy Now" bar (mobile only), like quick-commerce apps.
// Shown when the signed-in student has items in the cart; hidden on the
// cart and payment pages themselves. Count/total come from the live
// CartProvider, so the bar appears/disappears the moment the cart
// changes — no page reload needed.
export function MobileCartBarClient({ currencySymbol }: { currencySymbol: string }) {
  const pathname = usePathname()
  const { count, total } = useCart()
  if (count <= 0) return null
  if (pathname === '/cart' || pathname.startsWith('/payment')) return null

  return (
    <div className="lg:hidden">
      {/* In-flow spacer so the fixed bar never covers the footer content */}
      <div className="h-24" aria-hidden />
      <div
        className="fixed inset-x-3 bottom-3 z-40"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Link
          href="/cart"
          className="flex items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-2xl"
        >
          <span className="flex items-center gap-3">
            <span className="relative inline-flex">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -top-2 -right-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1 text-[11px] font-bold text-foreground">
                {count}
              </span>
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] uppercase tracking-wide opacity-80">
                {count} {count === 1 ? 'item' : 'items'} in cart
              </span>
              <span className="block text-base font-bold">
                {currencySymbol}
                {total.toLocaleString('en-IN')}
              </span>
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[15px] font-semibold">
            Buy Now
            <ArrowRight className="h-5 w-5" />
          </span>
        </Link>
      </div>
    </div>
  )
}
