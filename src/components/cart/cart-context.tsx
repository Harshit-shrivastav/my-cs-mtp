'use client'

// MY CS MTP — Live cart state for the header badge and the mobile
// bottom bar. Server components pass the initial count/total; any code
// that changes the cart calls notifyCartChanged() and every consumer
// re-fetches /api/cart, so counts update without a page reload.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export const CART_CHANGED_EVENT = 'mtp:cart-changed'

export function notifyCartChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CART_CHANGED_EVENT))
  }
}

interface CartState {
  count: number
  total: number
  refresh: () => void
}

const CartCtx = createContext<CartState>({ count: 0, total: 0, refresh: () => {} })

export function useCart() {
  return useContext(CartCtx)
}

export function CartProvider({
  initialCount,
  initialTotal,
  children,
}: {
  initialCount: number
  initialTotal: number
  children: React.ReactNode
}) {
  const [count, setCount] = useState(initialCount)
  const [total, setTotal] = useState(initialTotal)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/cart', { method: 'GET' })
      if (!r.ok) return
      const data = await r.json()
      setCount(Array.isArray(data.items) ? data.items.length : 0)
      setTotal(typeof data.totals?.subtotal === 'number' ? data.totals.subtotal : 0)
    } catch {
      // Keep the last known values on a network hiccup.
    }
  }, [])

  useEffect(() => {
    const handler = () => {
      void refresh()
    }
    window.addEventListener(CART_CHANGED_EVENT, handler)
    return () => window.removeEventListener(CART_CHANGED_EVENT, handler)
  }, [refresh])

  return <CartCtx.Provider value={{ count, total, refresh }}>{children}</CartCtx.Provider>
}
