import type { Metadata } from 'next'
import { Suspense } from 'react'
import { VerifyClient } from './verify-client'

export const metadata: Metadata = {
  title: 'Verify | MY CS MTP',
  description: 'Verify your email, complete login, or reset your password.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyClient />
    </Suspense>
  )
}
