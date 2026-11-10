import { NextResponse } from 'next/server'
import { requireAuth, isAuthCtx } from '@/lib/guards'

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (!isAuthCtx(auth)) return auth
  return NextResponse.json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      mobile: auth.user.mobile,
      role: auth.user.role,
      courseId: auth.user.courseId,
    },
  })
}
