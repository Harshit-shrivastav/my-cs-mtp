// MY CS MTP — Examiner area layout.
// Server-side: redirects based on role, fetches assignment counts,
// renders the sidebar + topbar shell.
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/server-auth'
import { getSettings } from '@/lib/settings'
import { ExaminerShell } from '@/components/examiner/examiner-shell'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { fetchExaminerCounts } from '@/lib/examiner-list'

export const metadata: Metadata = {
  title: 'Examiner Area — MY CS MTP',
  description: 'Private examiner area — evaluate student answer sheets.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function ExaminerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'STUDENT') redirect('/dashboard')
  if (user.role === 'ADMIN') redirect('/admin')
  // Only EXAMINER reaches here.

  const settings = await getSettings()
  const counts = await fetchExaminerCounts(user.id)

  return (
    <>
      <ExaminerShell
        user={{ name: user.name, email: user.email }}
        counts={counts}
        siteName={settings.siteName}
      >
        {children}
      </ExaminerShell>
      <SonnerToaster position="top-right" richColors />
    </>
  )
}
