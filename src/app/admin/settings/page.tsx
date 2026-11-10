// MY CS MTP — Admin site settings page. ADMIN-only (via admin layout).
// Full SiteConfig editor (grouped cards), email templates editor,
// change-admin-password and application log download.
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getCurrentUser } from '@/lib/server-auth'
import { SettingsForm, type EmailTemplateRow } from '@/components/admin/settings-form'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const [settings, templates, user] = await Promise.all([
    getSettings({ force: true }),
    db.emailTemplate.findMany({ orderBy: { key: 'asc' } }),
    getCurrentUser(),
  ])

  const serializedTemplates: EmailTemplateRow[] = templates.map((t) => ({
    id: t.id,
    key: t.key,
    subject: t.subject,
    body: t.body,
    updatedAt: t.updatedAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Site-wide configuration — identity, contact, social, display, email templates and admin
          account. Changes go live immediately.
        </p>
      </div>

      <SettingsForm settings={settings} templates={serializedTemplates} adminEmail={user?.email ?? ''} />
    </div>
  )
}
