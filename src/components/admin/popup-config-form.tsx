// MY CS MTP — Sale popup configuration form (client).
// Edits the salePopup* SiteSettings keys that the public popup reads.
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { FormField } from '@/components/admin/form-field'
import { ImagePicker } from '@/components/admin/image-picker'
import { toast } from 'sonner'
import { Loader2, Save, Megaphone } from 'lucide-react'

export interface PopupSettingsInitial {
  salePopupEnabled: boolean
  salePopupTitle: string
  salePopupText: string
  salePopupImageKey: string | null
  salePopupDelaySeconds: number
  salePopupFrequency: string
}

const FREQUENCY_OPTIONS = [
  { value: 'ONCE_PER_SESSION', label: 'Once per session' },
  { value: 'ALWAYS', label: 'Every page load' },
  { value: 'ONCE_PER_DAY', label: 'Once per day' },
]

export function PopupConfigForm({ initial }: { initial: PopupSettingsInitial }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initial.salePopupEnabled)
  const [title, setTitle] = useState(initial.salePopupTitle)
  const [text, setText] = useState(initial.salePopupText)
  const [imageKey, setImageKey] = useState(initial.salePopupImageKey || '')
  const [delaySeconds, setDelaySeconds] = useState(String(initial.salePopupDelaySeconds))
  const [frequency, setFrequency] = useState(initial.salePopupFrequency)
  const [busy, setBusy] = useState(false)

  async function save() {
    const delayNum = parseInt(delaySeconds, 10)
    if (!Number.isFinite(delayNum) || delayNum < 0 || delayNum > 600) {
      toast.error('Delay must be between 0 and 600 seconds.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/admin/popup-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salePopupEnabled: enabled,
          salePopupTitle: title.trim(),
          salePopupText: text.trim(),
          salePopupImageKey: imageKey || null,
          salePopupDelaySeconds: delayNum,
          salePopupFrequency: frequency,
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed to save popup settings.')
      toast.success('Sale popup settings saved. Changes go live within ~30 seconds.')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save popup settings.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          Sale popup
        </CardTitle>
        <CardDescription>
          The offer popup shown to visitors on the public site. Changes apply live within ~30 seconds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {/* Enabled */}
          <div className="flex items-center justify-between gap-3 rounded-md border p-3 sm:col-span-2">
            <div>
              <Label htmlFor="popup-enabled">Enabled</Label>
              <p className="text-xs text-muted-foreground">
                {enabled ? 'Popup is shown to visitors after the delay below.' : 'Popup is currently hidden from all visitors.'}
              </p>
            </div>
            <Switch id="popup-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <FormField id="popup-title" label="Title">
            <Input
              id="popup-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Special Offer!"
              maxLength={200}
            />
          </FormField>
          <FormField id="popup-frequency" label="Show frequency" helpText="How often returning visitors see the popup.">
            <select
              id="popup-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
            >
              {FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="popup-text" label="Text" full>
            <Textarea
              id="popup-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Use code WELCOME10 for 10% off on your first test series."
              rows={3}
              maxLength={1000}
            />
          </FormField>

          <FormField id="popup-image" label="Image (optional)" helpText="Shown alongside the popup text.">
            <ImagePicker
              keyPrefix="popup"
              initialKey={imageKey || null}
              onChange={(key) => setImageKey(key)}
            />
          </FormField>
          <FormField id="popup-delay" label="Delay (seconds)" helpText="Seconds after page load before the popup appears (0–600).">
            <Input
              id="popup-delay"
              type="number"
              min="0"
              max="600"
              step="1"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(e.target.value)}
              placeholder="5"
            />
          </FormField>

          <div className="flex items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save popup settings
            </Button>
            {!enabled && (
              <p className="text-xs text-amber-600">
                The popup is disabled — enable it to show it on the public site.
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
