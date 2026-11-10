// MY CS MTP — Admin layout. Server-side role redirect. Renders the admin
// shell (sidebar + topbar). robots: noindex, nofollow.
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/server-auth'
import { getSettings } from '@/lib/settings'
import { AdminShell } from '@/components/admin/admin-shell'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Admin — MY CS MTP',
  description: 'Private admin area — manage students, courses, papers and more.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'STUDENT') redirect('/dashboard')
  if (user.role === 'EXAMINER') redirect('/examiner')
  // Only ADMIN reaches here.

  const settings = await getSettings()

  return (
    <>
      <AdminShell
        user={{ name: user.name, email: user.email }}
        siteName={settings.siteName}
      >
        {children}
      </AdminShell>
      <SonnerToaster position="top-right" richColors />
    </>
  )
}
