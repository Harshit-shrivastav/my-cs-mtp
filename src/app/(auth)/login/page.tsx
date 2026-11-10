import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Log in | MY CS MTP',
  description: 'Log in to your MY CS MTP account.',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return <LoginForm />
}
