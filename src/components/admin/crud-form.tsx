'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { FileUpload } from '@/components/admin/file-upload'
import { toast } from 'sonner'
import { Loader2, Save, Plus } from 'lucide-react'

export interface FieldDef {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'switch' | 'date' | 'select' | 'image' | 'file' | 'password' | 'email'
  placeholder?: string
  helpText?: string
  required?: boolean
  options?: { value: string; label: string }[]
  keyPrefix?: string
  acceptExtensions?: string[]
  imageOnly?: boolean
  selectPlaceholder?: string
  step?: string
  min?: string
  autoSlugFrom?: string
}

export interface CrudFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  endpoint: string
  editMethod?: 'PATCH' | 'PUT'
  initial?: Record<string, any> | null
  idField?: string
  fields: FieldDef[]
  title: string
  description?: string
  onSuccess?: () => void
  submitLabel?: string
}

export function CrudForm({
  open,
  onOpenChange,
  endpoint,
  editMethod = 'PATCH',
  initial,
  idField = 'id',
  fields,
  title,
  description,
  onSuccess,
  submitLabel,
}: CrudFormProps) {
  const isEdit = !!initial
  const [values, setValues] = useState<Record<string, any>>({})
  const [busy, setBusy] = useState(false)
  const [fileKeys, setFileKeys] = useState<Record<string, string>>({})
  const [fileNames, setFileNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    const v: Record<string, any> = {}
    for (const f of fields) {
      if (initial) {
        v[f.name] = (initial as any)[f.name]
        if ((f.type === 'image' || f.type === 'file') && (initial as any)[f.name]) {
          setFileKeys((prev) => ({ ...prev, [f.name]: (initial as any)[f.name] }))
          setFileNames((prev) => ({ ...prev, [f.name]: String((initial as any)[f.name]).split('/').pop() || '' }))
        }
      } else {
        if (f.type === 'switch') v[f.name] = false
        else if (f.type === 'number') v[f.name] = ''
        else if (f.type === 'select') v[f.name] = ''
        else v[f.name] = ''
      }
    }
    setValues(v)
  }, [open, initial, fields])

  function setField(name: string, value: any) {
    setValues((prev) => {
      const next = { ...prev, [name]: value }
      // Auto-slug: if another field has `autoSlugFrom: name`, update it.
      const autoSlugField = fields.find((f) => f.autoSlugFrom === name)
      if (autoSlugField && !isEdit) {
        next[autoSlugField.name] = slugify(value)
      }
      return next
    })
  }

  function handleUpload(name: string, key: string, fileName: string) {
    setFileKeys((prev) => ({ ...prev, [name]: key }))
    setFileNames((prev) => ({ ...prev, [name]: fileName }))
    setValues((prev) => ({ ...prev, [name]: key }))
  }

  function clearUpload(name: string) {
    setFileKeys((prev) => {
      const copy = { ...prev }
      delete copy[name]
      return copy
    })
    setFileNames((prev) => {
      const copy = { ...prev }
      delete copy[name]
      return copy
    })
    setValues((prev) => ({ ...prev, [name]: '' }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    for (const f of fields) {
      if (f.required && (values[f.name] === undefined || values[f.name] === '' || values[f.name] === null)) {
        toast.error(`${f.label} is required.`)
        return
      }
    }
    setBusy(true)
    try {
      const payload: Record<string, any> = {}
      for (const f of fields) {
        const v = values[f.name]
        if (f.type === 'switch') payload[f.name] = !!v
        else if (f.type === 'number') payload[f.name] = v === '' || v === undefined ? null : Number(v)
        else if (f.type === 'date') payload[f.name] = v ? new Date(v).toISOString() : null
        else if (f.type === 'image' || f.type === 'file') payload[f.name] = fileKeys[f.name] || v || null
        else if (v === '' && f.type === 'select') payload[f.name] = null
        else payload[f.name] = v ?? null
      }

      const url = isEdit ? `${endpoint}/${(initial as any)[idField]}` : endpoint
      const method = isEdit ? editMethod : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success(isEdit ? 'Updated.' : 'Created.')
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div
                key={f.name}
                className={`space-y-1.5 ${
                  f.type === 'textarea' || f.type === 'file' || f.type === 'image' ? 'sm:col-span-2' : ''
                }`}
              >
                <Label htmlFor={f.name}>
                  {f.label}
                  {f.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderField(f, values[f.name], setField, handleUpload, clearUpload, fileKeys[f.name], fileNames[f.name])}
                {f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {submitLabel || (isEdit ? 'Save changes' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function renderField(
  f: FieldDef,
  value: any,
  setField: (name: string, value: any) => void,
  handleUpload: (name: string, key: string, fileName: string) => void,
  clearUpload: (name: string) => void,
  currentKey: string | undefined,
  currentName: string | undefined
): React.ReactNode {
  switch (f.type) {
    case 'textarea':
      return (
        <Textarea
          id={f.name}
          value={value ?? ''}
          onChange={(e) => setField(f.name, e.target.value)}
          placeholder={f.placeholder}
          rows={4}
        />
      )
    case 'switch':
      return (
        <div className="flex items-center gap-3 pt-1">
          <Switch
            id={f.name}
            checked={!!value}
            onCheckedChange={(v) => setField(f.name, v)}
          />
          <span className="text-xs text-muted-foreground">{value ? 'Enabled' : 'Disabled'}</span>
        </div>
      )
    case 'select':
      return (
        <select
          id={f.name}
          value={value ?? ''}
          onChange={(e) => setField(f.name, e.target.value)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
        >
          <option value="">{f.selectPlaceholder || 'Select…'}</option>
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    case 'number':
      return (
        <Input
          id={f.name}
          type="number"
          step={f.step}
          min={f.min}
          value={value ?? ''}
          onChange={(e) => setField(f.name, e.target.value)}
          placeholder={f.placeholder}
        />
      )
    case 'date':
      return (
        <Input
          id={f.name}
          type="datetime-local"
          value={value ? toLocalInput(value) : ''}
          onChange={(e) => setField(f.name, e.target.value)}
        />
      )
    case 'password':
      return (
        <Input
          id={f.name}
          type="password"
          value={value ?? ''}
          onChange={(e) => setField(f.name, e.target.value)}
          placeholder={f.placeholder}
        />
      )
    case 'email':
      return (
        <Input
          id={f.name}
          type="email"
          value={value ?? ''}
          onChange={(e) => setField(f.name, e.target.value)}
          placeholder={f.placeholder}
        />
      )
    case 'image':
    case 'file':
      return (
        <FileUpload
          keyPrefix={f.keyPrefix || 'uploads'}
          acceptExtensions={f.acceptExtensions}
          imageOnly={f.type === 'image'}
          initial={currentKey ? { key: currentKey, name: currentName || currentKey } : undefined}
          onUploaded={(r) => handleUpload(f.name, r.key, r.name)}
          onClear={() => clearUpload(f.name)}
        />
      )
    default:
      return (
        <Input
          id={f.name}
          type="text"
          value={value ?? ''}
          onChange={(e) => setField(f.name, e.target.value)}
          placeholder={f.placeholder}
        />
      )
  }
}

function toLocalInput(value: string): string {
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
