// MY CS MTP — Student dashboard layout.
// Server-side: redirects based on role. Renders the sidebar + topbar shell.
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/server-auth'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Dashboard — MY CS MTP',
  description: 'Your private student dashboard. Test series, performance, notes and more.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'ADMIN') redirect('/admin')
  if (user.role === 'EXAMINER') redirect('/examiner')
  // Only STUDENT reaches here.

  const [settings, course, wallet] = await Promise.all([
    getSettings(),
    user.courseId
      ? db.course.findUnique({ where: { id: user.courseId }, select: { id: true, name: true } })
      : Promise.resolve(null),
    db.wallet.findUnique({ where: { userId: user.id }, select: { balance: true } }),
  ])

  return (
    <>
      <DashboardShell
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          courseId: user.courseId,
          courseName: course?.name ?? null,
        }}
        walletBalance={wallet?.balance ?? 0}
        currencySymbol={settings.currencySymbol}
        siteName={settings.siteName}
      >
        {children}
      </DashboardShell>
      <SonnerToaster position="top-right" richColors />
    </>
  )
}
