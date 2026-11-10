'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'
import { Loader2 } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  trustDevice: z.boolean().optional().default(false),
})

type LoginValues = z.infer<typeof loginSchema>

const otpSchema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code.'),
  trustDevice: z.boolean().optional().default(false),
})

type OtpValues = z.infer<typeof otpSchema>

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState<string>('')
  const [stage, setStage] = useState<'LOGIN' | 'OTP'>('LOGIN')
  const [resendCooldown, setResendCooldown] = useState(0)

  const {
    register: registerLogin,
    handleSubmit: handleLogin,
    setValue: setLoginValue,
    watch: watchLogin,
    formState: { errors: loginErrors },
    reset: resetLogin,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', trustDevice: false },
  })

  const trustDeviceLogin = watchLogin('trustDevice')

  const {
    handleSubmit: handleOtpSubmit,
    setValue: setOtpValue,
    watch: watchOtp,
    formState: { errors: otpErrors },
    reset: resetOtp,
  } = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '', trustDevice: false },
  })

  const otpCode = watchOtp('code')
  const trustDeviceOtp = watchOtp('trustDevice')

  async function onLogin(values: LoginValues) {
    setError(null)
    setInfo(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            trustDevice: values.trustDevice,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.error || 'Could not log in. Please try again.')
          return
        }
        if (data.twoFactorRequired) {
          setEmail(values.email)
          setStage('OTP')
          setInfo(
            `We've sent a 6-digit code to ${values.email}. Enter it below or click the verification link in the email.`
          )
          return
        }
        if (data.redirect) {
          router.push(data.redirect)
          return
        }
        setError('Unexpected response from server.')
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  async function onOtpSubmit(values: OtpValues) {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/verify-2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            code: values.code,
            trustDevice: values.trustDevice,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.error || 'Invalid or expired code.')
          return
        }
        if (data.redirect) {
          router.push(data.redirect)
          return
        }
        setError('Unexpected response from server.')
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  async function onResend() {
    if (!email) return
    setResendCooldown(30)
    setError(null)
    try {
      await fetch('/api/auth/resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setInfo(`A fresh code has been sent to ${email}.`)
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

  function backToLogin() {
    setStage('LOGIN')
    setError(null)
    setInfo(null)
    resetOtp()
    resetLogin({ email, password: '', trustDevice: false })
  }

  if (stage === 'OTP') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Enter your login code</CardTitle>
          <CardDescription>
            We&apos;ve sent a 6-digit code to <strong>{email}</strong>. Enter it below to continue.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleOtpSubmit(onOtpSubmit)} noValidate>
          <CardContent className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="code">Login code</Label>
              <InputOTP
                id="code"
                maxLength={6}
                value={otpCode}
                onChange={(v) => setOtpValue('code', v, { shouldValidate: true })}
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
              {otpErrors.code && (
                <p className="text-xs text-destructive" role="alert">
                  {otpErrors.code.message}
                </p>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Don&apos;t want to type a code?{' '}
              <Link
                href={`/verify?email=${encodeURIComponent(email)}&purpose=LOGIN_2FA`}
                className="font-medium text-foreground hover:underline"
              >
                Click the verification link in your email
              </Link>
              .
            </p>

            <div className="flex items-center gap-2">
              <Checkbox
                id="trust-otp"
                checked={trustDeviceOtp}
                onCheckedChange={(v) =>
                  setOtpValue('trustDevice', v === true, { shouldValidate: false })
                }
              />
              <Label htmlFor="trust-otp" className="text-sm font-normal">
                Trust this device for 30 days (skip 2FA next time)
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 mt-2">
            <Button type="submit" className="w-full" disabled={pending || otpCode.length !== 6}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify and log in
            </Button>
            <div className="flex items-center justify-between w-full text-sm">
              <button
                type="button"
                onClick={backToLogin}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back to login
              </button>
              <button
                type="button"
                onClick={onResend}
                disabled={resendCooldown > 0}
                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Log in to continue your CS test series prep.</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin(onLogin)} noValidate>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!loginErrors.email}
              aria-describedby={loginErrors.email ? 'email-error' : undefined}
              {...registerLogin('email')}
            />
            {loginErrors.email && (
              <p id="email-error" className="text-xs text-destructive" role="alert">
                {loginErrors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              aria-invalid={!!loginErrors.password}
              aria-describedby={loginErrors.password ? 'password-error' : undefined}
              {...registerLogin('password')}
            />
            {loginErrors.password && (
              <p id="password-error" className="text-xs text-destructive" role="alert">
                {loginErrors.password.message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={trustDeviceLogin}
              onCheckedChange={(v) =>
                setLoginValue('trustDevice', v === true, { shouldValidate: false })
              }
            />
            <Label htmlFor="remember" className="text-sm font-normal">
              Remember this device (skip 2FA on this device)
            </Label>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 mt-2">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Log in
          </Button>
          <p className="text-sm text-muted-foreground text-center w-full">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-foreground hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
