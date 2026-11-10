// MY CS MTP — Student profile page (view/edit + change password).
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/server-auth'
import ProfileClient from '@/components/dashboard/profile-client'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const authed = await getCurrentUser()
  if (!authed) return null

  const user = await db.user.findUnique({
    where: { id: authed.id },
    select: { id: true, name: true, email: true, mobile: true, courseId: true },
  })
  if (!user) return null

  const courses = await db.course.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Manage your account details and password.
        </p>
      </div>

      <ProfileClient
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          courseId: user.courseId,
        }}
        courses={courses}
      />
    </div>
  )
}
