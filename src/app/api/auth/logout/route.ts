import { NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth-cookie'

// Logout is triggered by plain HTML form posts (header + dashboard /
// admin / examiner shells), so respond with a real redirect to the home
// page — returning JSON here left users staring at a raw JSON page.
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL('/', req.url), { status: 303 })
  clearAuthCookie(res)
  return res
}
