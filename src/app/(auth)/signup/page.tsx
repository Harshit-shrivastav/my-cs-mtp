import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { SignupForm } from './signup-form'

export const metadata: Metadata = {
  title: 'Create your account | MY CS MTP',
  description: 'Sign up for MY CS MTP — CS test series for CSEET, Executive & Professional.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  const courses = await db.course.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  })

  return <SignupForm courses={courses} />
}
