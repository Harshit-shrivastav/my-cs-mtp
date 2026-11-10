// MY CS MTP — OTP, verification token & email service.
// When SMTP is not configured, the OTP + verification link is written to dev.log
// so you can still complete flows during development.

import nodemailer from 'nodemailer'
import { db } from '@/lib/db'
import { VerificationPurpose } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes, randomInt } from 'crypto'
import { getSettings } from '@/lib/settings'

export interface VerificationIssue {
  code: string // raw 6-digit OTP (NOT stored)
  token: string // raw link token (NOT stored)
  expiresAt: Date
  linkUrl: string
}

const MINUTES_BY_PURPOSE: Record<VerificationPurpose, number> = {
  EMAIL_VERIFY: 60 * 24, // 24 hours
  LOGIN_2FA: 10,
  PASSWORD_RESET: 30,
}

export async function issueVerification(userId: string, purpose: VerificationPurpose): Promise<VerificationIssue> {
  // Invalidate previous unused tokens for the same purpose (so a fresh OTP cancels the old link and vice-versa)
  await db.verificationToken.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  })

  const code = String(randomInt(100000, 999999))
  const token = randomBytes(32).toString('hex')
  const codeHash = await bcrypt.hash(code, 10)
  const tokenHash = await bcrypt.hash(token, 10)
  const minutes = MINUTES_BY_PURPOSE[purpose]
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000)

  await db.verificationToken.create({
    data: { userId, purpose, codeHash, tokenHash, expiresAt },
  })

  const settings = await getSettings()
  const base = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const linkUrl = `${base}/verify?token=${token}&purpose=${purpose}`

  return { code, token, expiresAt, linkUrl }
}

export async function verifyByCode(userId: string, purpose: VerificationPurpose, code: string): Promise<boolean> {
  const tokens = await db.verificationToken.findMany({
    where: { userId, purpose, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  for (const t of tokens) {
    if (t.codeHash && await bcrypt.compare(code, t.codeHash)) {
      await db.verificationToken.update({ where: { id: t.id }, data: { usedAt: new Date() } })
      // Cancel the paired link
      await db.verificationToken.updateMany({
        where: { userId, purpose, usedAt: null },
        data: { usedAt: new Date() },
      })
      return true
    }
  }
  return false
}

export async function verifyByToken(token: string, purpose: VerificationPurpose): Promise<{ userId: string } | null> {
  const candidates = await db.verificationToken.findMany({
    where: { purpose, usedAt: null, expiresAt: { gt: new Date() } },
  })
  for (const t of candidates) {
    if (await bcrypt.compare(token, t.tokenHash)) {
      await db.verificationToken.update({ where: { id: t.id }, data: { usedAt: new Date() } })
      await db.verificationToken.updateMany({
        where: { userId: t.userId, purpose, usedAt: null },
        data: { usedAt: new Date() },
      })
      return { userId: t.userId }
    }
  }
  return null
}

// ----- Email sending -----
function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

export interface MailInput {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendMail(input: MailInput): Promise<void> {
  if (!isSmtpConfigured()) {
    // Dev fallback — log to console so OTP/links are visible
    console.log('\n========== EMAIL (dev mode — no SMTP configured) ==========')
    console.log(`To: ${input.to}`)
    console.log(`Subject: ${input.subject}`)
    console.log('--- body ---')
    console.log(input.text || input.html.replace(/<[^>]*>/g, ''))
    console.log('============================================================\n')
    return
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: (Number(process.env.SMTP_PORT) || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@mycsmtp.com',
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })
}

export async function sendVerificationEmail(userId: string, email: string, name: string | null): Promise<void> {
  const v = await issueVerification(userId, 'EMAIL_VERIFY')
  const settings = await getSettings()
  const subject = `Verify your email on ${settings.siteName}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color:#000000;">Verify your email</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Use the OTP below to verify your email, or click the verification link to confirm instantly.</p>
      <p style="font-size:28px; letter-spacing:6px; font-weight:bold; color:#000; padding:12px; background:#f8fafc; text-align:center; border-radius:6px;">${v.code}</p>
      <p>This OTP and link expire in 24 hours.</p>
      <p><a href="${v.linkUrl}" style="display:inline-block; padding:10px 18px; background:#000; color:#fff; text-decoration:none; border-radius:6px;">Verify via link</a></p>
      <p style="color:#555555; font-size:13px;">If you did not create an account, you can safely ignore this email.</p>
    </div>
  `
  await sendMail({ to: email, subject, html, text: `Use OTP ${v.code} or open: ${v.linkUrl}` })
}

export async function send2FALoginEmail(userId: string, email: string): Promise<VerificationIssue> {
  const v = await issueVerification(userId, 'LOGIN_2FA')
  const settings = await getSettings()
  const subject = `Your ${settings.siteName} login code`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color:#000000;">Two-factor login code</h2>
      <p>Use the OTP below to complete login, or click the link to sign in.</p>
      <p style="font-size:28px; letter-spacing:6px; font-weight:bold; color:#000; padding:12px; background:#f8fafc; text-align:center; border-radius:6px;">${v.code}</p>
      <p>This OTP and link expire in 10 minutes.</p>
      <p><a href="${v.linkUrl}" style="display:inline-block; padding:10px 18px; background:#000; color:#fff; text-decoration:none; border-radius:6px;">Sign in via link</a></p>
    </div>
  `
  await sendMail({ to: email, subject, html, text: `OTP: ${v.code}\nLink: ${v.linkUrl}` })
  return v
}

export async function sendPasswordResetEmail(userId: string, email: string): Promise<void> {
  const v = await issueVerification(userId, 'PASSWORD_RESET')
  const settings = await getSettings()
  const subject = `Reset your ${settings.siteName} password`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color:#000000;">Reset password</h2>
      <p>Use the OTP below or click the reset link to set a new password.</p>
      <p style="font-size:28px; letter-spacing:6px; font-weight:bold; color:#000; padding:12px; background:#f8fafc; text-align:center; border-radius:6px;">${v.code}</p>
      <p>This OTP and link expire in 30 minutes.</p>
      <p><a href="${v.linkUrl}" style="display:inline-block; padding:10px 18px; background:#000; color:#fff; text-decoration:none; border-radius:6px;">Reset password</a></p>
    </div>
  `
  await sendMail({ to: email, subject, html, text: `OTP: ${v.code}\nLink: ${v.linkUrl}` })
}

export async function sendWelcomeEmail(email: string, name: string | null): Promise<void> {
  const settings = await getSettings()
  const base = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const loginUrl = `${base}/login`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color:#000000;">Your account has been created</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Your ${settings.siteName} account has been created successfully. No verification is needed — you can log in right away and start your CS test series prep.</p>
      <p><a href="${loginUrl}" style="display:inline-block; padding:10px 18px; background:#000; color:#fff; text-decoration:none; border-radius:6px;">Log in to your account</a></p>
      <p style="color:#555555; font-size:13px;">If you did not create this account, you can safely ignore this email.</p>
    </div>
  `
  await sendMail({
    to: email,
    subject: `Your ${settings.siteName} account has been created`,
    html,
    text: `Hi ${name || 'there'}, your ${settings.siteName} account has been created successfully. Log in here: ${loginUrl}`,
  })
}

export async function sendPurchaseSuccessEmail(email: string, orderId: string, total: number): Promise<void> {
  const settings = await getSettings()
  await sendMail({
    to: email,
    subject: `Purchase successful — ${settings.siteName}`,
    html: `<div style="font-family:Arial; padding:24px;">
      <h2 style="color:#000000;">Payment successful</h2>
      <p>Thanks for your purchase. Your order id is <b>${orderId}</b> and the amount paid was ${settings.currencySymbol}${total.toFixed(2)}.</p>
      <p>You can now download your test papers and start writing.</p>
    </div>`,
    text: `Purchase successful. Order ${orderId}. Amount ${settings.currencySymbol}${total}.`,
  })
}

export async function sendEvaluationEmail(email: string, paperTitle: string, marks: number, maxMarks: number): Promise<void> {
  const settings = await getSettings()
  await sendMail({
    to: email,
    subject: `Your evaluation is ready — ${settings.siteName}`,
    html: `<div style="font-family:Arial; padding:24px;">
      <h2 style="color:#000000;">Evaluation ready</h2>
      <p>Your answer sheet for <b>${paperTitle}</b> has been evaluated. You scored <b>${marks}/${maxMarks}</b>.</p>
      <p>Log in to your dashboard to view remarks and download the evaluated copy.</p>
    </div>`,
    text: `Evaluation ready for ${paperTitle}: ${marks}/${maxMarks}.`,
  })
}
