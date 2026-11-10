'use client'
import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

const PURPOSES = ['EMAIL_VERIFY', 'LOGIN_2FA', 'PASSWORD_RESET'] as const
type Purpose = (typeof PURPOSES)[number]

const otpSchema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code.'),
})
type OtpValues = z.infer<typeof otpSchema>

const COPY: Record<Purpose, { title: string; description: string }> = {
  EMAIL_VERIFY: {
    title: 'Verify your email',
    description: 'Enter the 6-digit code we sent to your inbox to confirm your email address.',
  },
  LOGIN_2FA: {
    title: 'Confirm it’s you',
    description: 'Enter the 6-digit login code we sent to your inbox to finish signing in.',
  },
  PASSWORD_RESET: {
    title: 'Confirm password reset',
    description: 'Enter the 6-digit code we sent to your inbox to continue resetting your password.',
  },
}

export function VerifyClient() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')
  const purposeParam = (params.get('purpose') as Purpose | null) || 'EMAIL_VERIFY'
  const emailParam = params.get('email') || ''

  const [stage, setStage] = useState<'LOADING' | 'FORM' | 'SUCCESS' | 'ERROR'>(
    token ? 'LOADING' : 'FORM'
  )
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [pending, startTransition] = useTransition()

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
  })
  const code = watch('code')

  // If a token was provided in the URL, immediately call /api/auth/verify-token.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, purpose: purposeParam }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(data?.error || 'This link is invalid, expired, or already used.')
          setStage('ERROR')
          return
        }
        handleVerifySuccess(data)
      } catch {
        if (cancelled) return
        setError('Could not verify the link. Please try again.')
        setStage('ERROR')
      }
    })
    return () => {
      cancelled = true
    }
  }, [token, purposeParam])

  function handleVerifySuccess(data: any) {
    if (data.action === 'EMAIL_VERIFIED') {
      setStage('SUCCESS')
      setInfo('Your email is verified. Redirecting you to login…')
      setTimeout(() => router.push('/login'), 1500)
      return
    }
    if (data.action === 'LOGGED_IN') {
      setStage('SUCCESS')
      setInfo('Login confirmed. Redirecting…')
      setTimeout(() => router.push(data.redirect || '/'), 800)
      return
    }
    if (data.action === 'RESET_LINK' && data.resetToken) {
      setStage('SUCCESS')
      setInfo('Identity verified. Redirecting you to set a new password…')
      setTimeout(() => router.push(`/reset-password?token=${data.resetToken}`), 800)
      return
    }
    setError('Unexpected response from server.')
    setStage('ERROR')
  }

  async function onOtpSubmit(values: OtpValues) {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailParam, purpose: purposeParam, code: values.code }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.error || 'Invalid or expired code.')
          return
        }
        handleVerifySuccess(data)
      } catch {
        setError('Could not verify the code. Please try again.')
      }
    })
  }

  async function onResend() {
    if (!emailParam) {
      setError('We need your email to resend the code. Please go back and try again.')
      return
    }
    setResendCooldown(30)
    setError(null)
    try {
      await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam, purpose: purposeParam }),
      })
      setInfo('A fresh code has been sent to your inbox.')
    } catch {
      setError('Could not resend the code. Please try again later.')
    }
    const timer = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  const copy = COPY[purposeParam]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {stage === 'LOADING' && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying your link…
          </div>
        )}

        {stage === 'SUCCESS' && (
          <Alert variant="default">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Verified</AlertTitle>
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        )}

        {stage === 'ERROR' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Verification failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {stage === 'FORM' && (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {info && (
              <Alert>
                <AlertDescription>{info}</AlertDescription>
              </Alert>
            )}

            {!emailParam && (
              <Alert variant="destructive">
                <AlertDescription>
                  We need your email to verify the code. Please return to the page that sent you here.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onOtpSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="code">Enter the code from your email</Label>
                <InputOTP
                  id="code"
                  maxLength={6}
                  value={code}
                  onChange={(v) => setValue('code', v, { shouldValidate: true })}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                {errors.code && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.code.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={pending || code.length !== 6 || !emailParam}
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify code
              </Button>
            </form>

            <div className="border-t pt-3 text-sm text-muted-foreground space-y-1">
              <p>
                Or click the verification link sent to your email — no need to type the code.
              </p>
              <p>
                Didn&apos;t get it?{' '}
                <button
                  type="button"
                  onClick={onResend}
                  disabled={resendCooldown > 0 || !emailParam}
                  className="font-medium text-foreground hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code & link'}
                </button>
              </p>
              {purposeParam === 'LOGIN_2FA' && (
                <p className="pt-1">
                  Want to enter the code from your login screen instead?{' '}
                  <Link href="/login" className="font-medium text-foreground hover:underline">
                    Back to login
                  </Link>
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-center">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Back to home
        </Link>
      </CardFooter>
    </Card>
  )
}
