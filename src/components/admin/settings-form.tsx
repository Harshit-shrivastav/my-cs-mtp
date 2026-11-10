'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileUpload, ImageUpload } from '@/components/admin/file-upload'
import { AsyncActionButton, ConfirmDialog } from '@/components/admin/confirm-dialog'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Download,
  FileClock,
  KeyRound,
  Loader2,
  Mail,
  Palette,
  Pencil,
  Percent,
  Phone,
  Save,
  Share2,
  ShieldCheck,
} from 'lucide-react'
import type { SiteSettings } from '@/lib/settings'

export interface EmailTemplateRow {
  id: string
  key: string
  subject: string
  body: string
  updatedAt: string
}

export interface SettingsFormProps {
  settings: SiteSettings
  templates: EmailTemplateRow[]
  adminEmail: string
}

/** Real placeholder names per template key (from the seeded template bodies). */
const TEMPLATE_PLACEHOLDERS: Record<string, string[]> = {
  welcome: ['{{name}}'],
  verify_email: ['{{code}}', '{{link}}'],
  login_2fa: ['{{code}}', '{{link}}'],
  password_reset: ['{{code}}', '{{link}}'],
  purchase_success: ['{{orderId}}', '{{amount}}'],
  evaluation_completed: ['{{paperTitle}}', '{{marks}}', '{{maxMarks}}'],
}

export function SettingsForm({ settings, templates, adminEmail }: SettingsFormProps) {
  const router = useRouter()

  // ---- form state (one object; each card saves only its own keys) ----
  const [v, setV] = useState({
    siteName: settings.siteName,
    tagline: settings.tagline,
    logoKey: settings.logoKey ?? '',
    faviconKey: settings.faviconKey ?? '',
    ogImageKey: settings.ogImageKey ?? '',
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    whatsappNumber: settings.whatsappNumber,
    whatsappLink: settings.whatsappLink,
    address: settings.address,
    facebook: settings.facebook,
    instagram: settings.instagram,
    twitter: settings.twitter,
    youtube: settings.youtube,
    currencySymbol: settings.currencySymbol,
    subjectsBeforeViewMore: String(settings.subjectsBeforeViewMore),
    assignmentUploadEnabled: settings.assignmentUploadEnabled,
    assignmentUploadDisabledMessage: settings.assignmentUploadDisabledMessage,
    evaluationPromiseText: settings.evaluationPromiseText,
    freeContentEnabled: settings.freeContentEnabled,
    twoFactorEnabled: settings.twoFactorEnabled,
    googleAnalyticsId: settings.googleAnalyticsId,
  })
  function setField(name: keyof typeof v, value: string | boolean) {
    setV((prev) => ({ ...prev, [name]: value }))
  }

  async function patch(payload: Record<string, unknown>) {
    const r = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || 'Failed to save settings.')
    router.refresh()
  }

  // ---- email template editor state ----
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateRow | null>(null)
  const [tplSubject, setTplSubject] = useState('')
  const [tplBody, setTplBody] = useState('')
  const [tplBusy, setTplBusy] = useState(false)

  function openTemplate(t: EmailTemplateRow) {
    setEditingTemplate(t)
    setTplSubject(t.subject)
    setTplBody(t.body)
  }

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingTemplate) return
    setTplBusy(true)
    try {
      const r = await fetch(`/api/admin/email-templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: tplSubject.trim(), body: tplBody }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed to save email template.')
      toast.success(`Template "${editingTemplate.key}" saved.`)
      setEditingTemplate(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save email template.')
    } finally {
      setTplBusy(false)
    }
  }

  // ---- change password state ----
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')

  function validatePasswordInputs(): string | null {
    if (!pwCurrent) return 'Enter your current password.'
    if (pwNew.length < 8) return 'New password must be at least 8 characters long.'
    if (!/[A-Za-z]/.test(pwNew) || !/[0-9]/.test(pwNew)) {
      return 'New password must include a letter and a number.'
    }
    if (pwNew !== pwConfirm) return 'New password and confirmation do not match.'
    return null
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------ IDENTITY ------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-muted-foreground" />
            Identity
          </CardTitle>
          <CardDescription>Site name, tagline and brand images.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Site name" htmlFor="siteName">
              <Input
                id="siteName"
                value={v.siteName}
                onChange={(e) => setField('siteName', e.target.value)}
              />
            </Field>
            <Field label="Tagline" htmlFor="tagline">
              <Input
                id="tagline"
                value={v.tagline}
                onChange={(e) => setField('tagline', e.target.value)}
              />
            </Field>
          </div>
          <Field label="Logo" htmlFor="logoKey" help="Shown in the site header.">
            <ImageUpload
              keyPrefix="branding/logo"
              initial={v.logoKey ? { key: v.logoKey, name: v.logoKey.split('/').pop() || v.logoKey } : undefined}
              onUploaded={(r) => setField('logoKey', r.key)}
              onClear={() => setField('logoKey', '')}
            />
          </Field>
          <Field label="Favicon" htmlFor="faviconKey" help="Shown in browser tabs (ico, png, svg or webp).">
            <FileUpload
              keyPrefix="branding/favicon"
              imageOnly
              acceptExtensions={['ico', 'png', 'svg', 'webp']}
              acceptMime="image/x-icon,image/png,image/svg+xml,image/webp"
              initial={v.faviconKey ? { key: v.faviconKey, name: v.faviconKey.split('/').pop() || v.faviconKey } : undefined}
              onUploaded={(r) => setField('faviconKey', r.key)}
              onClear={() => setField('faviconKey', '')}
            />
          </Field>
          <Field
            label="OG image (social share)"
            htmlFor="ogImageKey"
            help="Used as the preview image when pages are shared on social media."
          >
            <ImageUpload
              keyPrefix="branding/og"
              initial={v.ogImageKey ? { key: v.ogImageKey, name: v.ogImageKey.split('/').pop() || v.ogImageKey } : undefined}
              onUploaded={(r) => setField('ogImageKey', r.key)}
              onClear={() => setField('ogImageKey', '')}
            />
          </Field>
          <Field label="Theme color" htmlFor="themeColor" help="Site primary colour (browser/meta theme-color).">
            <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/30 px-3 text-sm">
              <span className="h-4 w-4 rounded-sm border" style={{ backgroundColor: '#000000' }} aria-hidden />
              <span className="font-mono">#000000</span>
              <span className="text-xs text-muted-foreground">(fixed)</span>
            </div>
          </Field>
          <CardSaveFooter
            payload={{
              siteName: v.siteName,
              tagline: v.tagline,
              logoKey: v.logoKey || null,
              faviconKey: v.faviconKey || null,
              ogImageKey: v.ogImageKey || null,
            }}
            patch={patch}
            successMessage="Identity settings saved."
            label="Save identity"
          />
        </CardContent>
      </Card>

      {/* ------------------------------ CONTACT ------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Contact
          </CardTitle>
          <CardDescription>Support contact details shown across the site.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Support email" htmlFor="supportEmail">
              <Input
                id="supportEmail"
                type="email"
                value={v.supportEmail}
                onChange={(e) => setField('supportEmail', e.target.value)}
              />
            </Field>
            <Field label="Support phone" htmlFor="supportPhone">
              <Input
                id="supportPhone"
                value={v.supportPhone}
                onChange={(e) => setField('supportPhone', e.target.value)}
              />
            </Field>
            <Field label="WhatsApp number" htmlFor="whatsappNumber" help="Digits only, with country code.">
              <Input
                id="whatsappNumber"
                value={v.whatsappNumber}
                onChange={(e) => setField('whatsappNumber', e.target.value)}
              />
            </Field>
            <Field label="WhatsApp link" htmlFor="whatsappLink" help="e.g. https://wa.me/919000000000">
              <Input
                id="whatsappLink"
                value={v.whatsappLink}
                onChange={(e) => setField('whatsappLink', e.target.value)}
              />
            </Field>
          </div>
          <Field label="Address" htmlFor="address">
            <Textarea
              id="address"
              rows={2}
              value={v.address}
              onChange={(e) => setField('address', e.target.value)}
            />
          </Field>
          <CardSaveFooter
            payload={{
              supportEmail: v.supportEmail,
              supportPhone: v.supportPhone,
              whatsappNumber: v.whatsappNumber,
              whatsappLink: v.whatsappLink,
              address: v.address,
            }}
            patch={patch}
            successMessage="Contact settings saved."
            label="Save contact"
          />
        </CardContent>
      </Card>

      {/* ------------------------------ SOCIAL ------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            Social
          </CardTitle>
          <CardDescription>Optional social profile URLs (leave blank to hide icons).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Facebook URL" htmlFor="facebook">
              <Input id="facebook" value={v.facebook} onChange={(e) => setField('facebook', e.target.value)} placeholder="https://facebook.com/…" />
            </Field>
            <Field label="Instagram URL" htmlFor="instagram">
              <Input id="instagram" value={v.instagram} onChange={(e) => setField('instagram', e.target.value)} placeholder="https://instagram.com/…" />
            </Field>
            <Field label="Twitter / X URL" htmlFor="twitter">
              <Input id="twitter" value={v.twitter} onChange={(e) => setField('twitter', e.target.value)} placeholder="https://x.com/…" />
            </Field>
            <Field label="YouTube URL" htmlFor="youtube">
              <Input id="youtube" value={v.youtube} onChange={(e) => setField('youtube', e.target.value)} placeholder="https://youtube.com/@…" />
            </Field>
          </div>
          <CardSaveFooter
            payload={{ facebook: v.facebook, instagram: v.instagram, twitter: v.twitter, youtube: v.youtube }}
            patch={patch}
            successMessage="Social links saved."
            label="Save social"
          />
        </CardContent>
      </Card>

      {/* ------------------------- CATALOGUE & DISPLAY ------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4 text-muted-foreground" />
            Catalogue &amp; display
          </CardTitle>
          <CardDescription>Currency and subject list truncation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency symbol" htmlFor="currencySymbol">
              <Input
                id="currencySymbol"
                value={v.currencySymbol}
                onChange={(e) => setField('currencySymbol', e.target.value)}
              />
            </Field>
            <Field
              label="Subjects before “View more”"
              htmlFor="subjectsBeforeViewMore"
              help="How many subjects to show before a plan page collapses the rest."
            >
              <Input
                id="subjectsBeforeViewMore"
                type="number"
                min="0"
                step="1"
                value={v.subjectsBeforeViewMore}
                onChange={(e) => setField('subjectsBeforeViewMore', e.target.value)}
              />
            </Field>
          </div>
          <CardSaveFooter
            payload={{
              currencySymbol: v.currencySymbol,
              subjectsBeforeViewMore: Math.max(0, parseInt(v.subjectsBeforeViewMore, 10) || 0),
            }}
            patch={patch}
            successMessage="Display settings saved."
            label="Save display"
          />
        </CardContent>
      </Card>

      {/* -------------------- ASSIGNMENT & EVALUATION -------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileClock className="h-4 w-4 text-muted-foreground" />
            Assignment &amp; evaluation
          </CardTitle>
          <CardDescription>Assignment upload switch and evaluation promise text.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assignmentUploadEnabled">Assignment uploads enabled</Label>
            <div className="flex items-center gap-3">
              <Switch
                id="assignmentUploadEnabled"
                checked={v.assignmentUploadEnabled}
                onCheckedChange={(b) => setField('assignmentUploadEnabled', b)}
              />
              <span className="text-xs text-muted-foreground">
                {v.assignmentUploadEnabled ? 'Enabled' : 'Disabled — students see the message below'}
              </span>
            </div>
          </div>
          <Field
            label="Uploads disabled message"
            htmlFor="assignmentUploadDisabledMessage"
            help="Shown to students when uploads are switched off."
          >
            <Textarea
              id="assignmentUploadDisabledMessage"
              rows={2}
              value={v.assignmentUploadDisabledMessage}
              onChange={(e) => setField('assignmentUploadDisabledMessage', e.target.value)}
            />
          </Field>
          <Field
            label="Evaluation promise text"
            htmlFor="evaluationPromiseText"
            help="Shown on plan/course pages to set expectations for evaluated copies."
          >
            <Textarea
              id="evaluationPromiseText"
              rows={2}
              value={v.evaluationPromiseText}
              onChange={(e) => setField('evaluationPromiseText', e.target.value)}
            />
          </Field>
          <CardSaveFooter
            payload={{
              assignmentUploadEnabled: v.assignmentUploadEnabled,
              assignmentUploadDisabledMessage: v.assignmentUploadDisabledMessage,
              evaluationPromiseText: v.evaluationPromiseText,
            }}
            patch={patch}
            successMessage="Assignment & evaluation settings saved."
            label="Save assignment settings"
          />
        </CardContent>
      </Card>

      {/* --------------------------- FREE CONTENT --------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Free content
          </CardTitle>
          <CardDescription>Free resources section on the site &amp; student dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="freeContentEnabled">Free content enabled</Label>
            <div className="flex items-center gap-3">
              <Switch
                id="freeContentEnabled"
                checked={v.freeContentEnabled}
                onCheckedChange={(b) => setField('freeContentEnabled', b)}
              />
              <span className="text-xs text-muted-foreground">
                {v.freeContentEnabled ? 'Enabled' : 'Disabled — free resources are hidden'}
              </span>
            </div>
          </div>
          <CardSaveFooter
            payload={{ freeContentEnabled: v.freeContentEnabled }}
            patch={patch}
            successMessage="Free content setting saved."
            label="Save free content"
          />
        </CardContent>
      </Card>

      {/* -------------------------- TWO-FACTOR AUTH -------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Two-Factor Auth
          </CardTitle>
          <CardDescription>
            Email-OTP second step at login. Applies to student &amp; examiner logins — admins always
            skip 2FA. Users can mark a device as trusted to skip it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="twoFactorEnabled">Two-factor login required</Label>
            <div className="flex items-center gap-3">
              <Switch
                id="twoFactorEnabled"
                checked={v.twoFactorEnabled}
                onCheckedChange={(b) => setField('twoFactorEnabled', b)}
              />
              <span className="text-xs text-muted-foreground">
                {v.twoFactorEnabled ? 'Enabled — OTP emailed on login' : 'Disabled — password only'}
              </span>
            </div>
          </div>
          <CardSaveFooter
            payload={{ twoFactorEnabled: v.twoFactorEnabled }}
            patch={patch}
            successMessage="Two-factor setting saved."
            label="Save 2FA setting"
          />
        </CardContent>
      </Card>

      {/* ----------------------------- ANALYTICS ----------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Analytics
          </CardTitle>
          <CardDescription>Google Analytics measurement ID (e.g. G-XXXXXXXXXX).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Google Analytics ID" htmlFor="googleAnalyticsId">
            <Input
              id="googleAnalyticsId"
              value={v.googleAnalyticsId}
              onChange={(e) => setField('googleAnalyticsId', e.target.value)}
              placeholder="G-XXXXXXXXXX"
            />
          </Field>
          <CardSaveFooter
            payload={{ googleAnalyticsId: v.googleAnalyticsId }}
            patch={patch}
            successMessage="Analytics settings saved."
            label="Save analytics"
          />
        </CardContent>
      </Card>

      {/* -------------------------- EMAIL TEMPLATES -------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email templates
          </CardTitle>
          <CardDescription>
            Subject &amp; body for transactional email templates. The template key is immutable;
            <span className="font-mono"> {'{{placeholders}}'}</span> are replaced per email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No email templates found. Run the database seed to create the default templates.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Placeholders</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {t.key}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate">{t.subject}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(TEMPLATE_PLACEHOLDERS[t.key] || []).map((p) => (
                          <span key={p} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                            {p}
                          </span>
                        ))}
                        {!TEMPLATE_PLACEHOLDERS[t.key] && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openTemplate(t)} className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ------------------------- CHANGE PASSWORD ------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Change admin password</CardTitle>
          <CardDescription>
            Changes the password for the currently logged-in admin{adminEmail ? ` (${adminEmail})` : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Current password" htmlFor="pw-current">
              <Input
                id="pw-current"
                type="password"
                autoComplete="current-password"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
              />
            </Field>
            <Field label="New password" htmlFor="pw-new" help="≥ 8 chars, letter + number.">
              <Input
                id="pw-new"
                type="password"
                autoComplete="new-password"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
              />
            </Field>
            <Field label="Confirm new password" htmlFor="pw-confirm">
              <Input
                id="pw-confirm"
                type="password"
                autoComplete="new-password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <ConfirmDialog
              trigger={
                <Button className="gap-1.5">
                  <KeyRound className="h-4 w-4" />
                  Change password
                </Button>
              }
              title="Change admin password?"
              description={
                <>
                  This will change the password for{' '}
                  <span className="font-semibold">{adminEmail || 'this admin account'}</span>. You
                  will need the new password at the next login.
                </>
              }
              confirmLabel="Change password"
              destructive={false}
              successMessage="Password changed."
              onConfirm={async () => {
                const err = validatePasswordInputs()
                if (err) throw new Error(err)
                const r = await fetch('/api/admin/change-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
                })
                const data = await r.json().catch(() => ({}))
                if (!r.ok) throw new Error(data.error || 'Failed to change password.')
                setPwCurrent('')
                setPwNew('')
                setPwConfirm('')
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ------------------------- APPLICATION LOGS ------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Application logs</CardTitle>
          <CardDescription>
            Download the last ~2000 lines of the server log (file from env
            <span className="font-mono"> LOG_FILE</span>, default <span className="font-mono">dev.log</span>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="gap-1.5">
            <a href="/api/admin/logs" download>
              <Download className="h-4 w-4" />
              Download logs (mycsmtp-logs.txt)
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* --------------------- EMAIL TEMPLATE EDIT DIALOG --------------------- */}
      <Dialog open={!!editingTemplate} onOpenChange={(o) => !o && setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit template <span className="font-mono">{editingTemplate?.key}</span>
            </DialogTitle>
            <DialogDescription>
              Key is immutable. Use the placeholders below — they are replaced with real values when
              the email is sent.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveTemplate} className="space-y-4">
            {editingTemplate && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Placeholders:</span>
                {(TEMPLATE_PLACEHOLDERS[editingTemplate.key] || []).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTplBody((prev) => prev + p)}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground hover:bg-accent"
                    title="Click to insert into body"
                  >
                    {p}
                  </button>
                ))}
                {!TEMPLATE_PLACEHOLDERS[editingTemplate.key]?.length && (
                  <span className="text-xs text-muted-foreground">No placeholders documented for this key.</span>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="tpl-subject">
                Subject<span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="tpl-subject"
                value={tplSubject}
                onChange={(e) => setTplSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-body">
                Body<span className="text-destructive ml-1">*</span>
              </Label>
              <Textarea
                id="tpl-body"
                rows={10}
                value={tplBody}
                onChange={(e) => setTplBody(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingTemplate(null)} disabled={tplBusy}>
                Cancel
              </Button>
              <Button type="submit" disabled={tplBusy} className="gap-1.5">
                {tplBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ------------------------------- helpers -------------------------------

interface CardSaveFooterProps {
  payload: Record<string, unknown>
  patch: (payload: Record<string, unknown>) => Promise<void>
  successMessage: string
  label: string
}

function CardSaveFooter({ payload, patch, successMessage, label }: CardSaveFooterProps) {
  return (
    <>
      <Separator />
      <div className="flex justify-end">
        <AsyncActionButton onClick={() => patch(payload)} successMessage={successMessage} className="gap-1.5">
          <Save className="h-4 w-4" />
          {label}
        </AsyncActionButton>
      </div>
    </>
  )
}

function Field({
  label,
  htmlFor,
  help,
  children,
}: {
  label: string
  htmlFor: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  )
}
