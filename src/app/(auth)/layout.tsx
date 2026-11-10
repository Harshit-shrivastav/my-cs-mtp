// Auth route group layout — minimal, no header/footer, robots noindex.
import type { Metadata } from 'next'
import Link from 'next/link'
import { getSettings } from '@/lib/settings'
import { publicUrl } from '@/lib/storage'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Account | MY CS MTP',
  description: 'Sign in, sign up, or recover your MY CS MTP account.',
  robots: { index: false, follow: false },
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings()
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="container mx-auto px-4 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Link href="/" className="flex items-center gap-2 font-semibold text-xl">
            {s.logoKey ? (
              <img
                src={publicUrl(s.logoKey) || ''}
                alt={s.siteName + ' logo'}
                className="h-10 w-10 object-contain"
              />
            ) : (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
                MTP
              </span>
            )}
            <span>{s.siteName}</span>
          </Link>
          <p className="text-sm text-muted-foreground max-w-sm">{s.tagline}</p>
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
