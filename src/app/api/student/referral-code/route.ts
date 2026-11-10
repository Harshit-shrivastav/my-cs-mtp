// MY CS MTP — Generate / fetch referral code for the current student.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { makeReferralCode } from '@/lib/utils-extra'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx
  const userId = ctx.user.id

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, referralCode: true },
  })
  if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

  let code = user.referralCode
  if (!code) {
    code = makeReferralCode(user.name, user.email)
    try {
      await db.user.update({
        where: { id: userId },
        data: { referralCode: code },
      })
    } catch {
      // Race-condition fallback — re-read whatever won
      const fresh = await db.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
      })
      code = fresh?.referralCode || code
    }
  }

  const base = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const link = `${base}/signup?ref=${code}`

  return NextResponse.json({ code, link })
}
