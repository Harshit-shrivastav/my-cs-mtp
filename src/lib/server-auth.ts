// MY CS MTP — Server-side fetcher for the current authenticated user.
// Used by layouts and headers to render login/account UI on SSR pages.
import { db } from '@/lib/db'
import { verifyToken, extractTokenAny } from '@/lib/auth'
import { headers } from 'next/headers'

export interface AuthedUser {
  id: string
  email: string
  name: string | null
  role: 'STUDENT' | 'ADMIN' | 'EXAMINER'
  mobile: string | null
}

export async function getCurrentUser(): Promise<AuthedUser | null> {
  const h = await headers()
  const cookie = h.get('cookie') || ''
  // Simulate a Request just for token extraction
  const req = new Request('http://localhost', { headers: { cookie } })
  const token = extractTokenAny(req)
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload) return null
  const u = await db.user.findUnique({ where: { id: payload.sub } })
  if (!u || u.isBlocked) return null
  return { id: u.id, email: u.email, name: u.name, role: u.role, mobile: u.mobile }
}

export async function getCartCount(): Promise<number> {
  const user = await getCurrentUser()
  if (!user) return 0
  const count = await db.cartItem.count({ where: { userId: user.id } })
  return count
}
