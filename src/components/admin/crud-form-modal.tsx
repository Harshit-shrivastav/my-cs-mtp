'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Plus } from 'lucide-react'
import { toast } from 'sonner'

export interface CrudFormModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Endpoint base (no trailing id). POST on create, PATCH on edit. */
  endpoint: string
  /** Existing record id; pass null/undefined for create. */
  id?: string | null
  /** Dialog title */
  title: string
  /** Optional sub-description */
  description?: string
  /** Submit button label */
  submitLabel?: string
  /** Pre-fill values */
  initial?: Record<string, unknown> | null
  /**
   * Build the JSON payload from current values. Return an object that will be
   * POSTed/PATCHed. Throw an Error to abort submission (the message becomes a
   * toast). If omitted, the raw values object is sent as-is.
   */
  serialize?: (values: Record<string, unknown>) => Record<string, unknown>
  /** Custom submit — bypass the default fetch, do your own work. */
  onSubmit?: (values: Record<string, unknown>) => Promise<void>
  /** Called after a successful submit (after the dialog closes). */
  onSuccess?: () => void
  /** Render the form fields. Receives the live values + setters. */
  children: (api: {
    values: Record<string, unknown>
    set: (name: string, value: unknown) => void
    busy: boolean
  }) => React.ReactNode
  /** Width class — defaults to a wide modal. */
  contentClassName?: string
  /** HTTP method for edits (default PATCH) */
  editMethod?: 'PATCH' | 'PUT'
}

/**
 * Generic modal form wrapper. Manages open state, value pre-fill, busy state,
 * and a default JSON POST/PATCH submit. Use the render-prop `children` to
 * render form fields. Reused by both create and edit flows — pass `id` for
 * edits and leave it null for creates.
 */
export function CrudFormModal({
  open,
  onOpenChange,
  endpoint,
  id,
  title,
  description,
  submitLabel,
  initial,
  serialize,
  onSubmit,
  onSuccess,
  children,
  contentClassName = 'sm:max-w-2xl max-h-[90vh] overflow-y-auto',
  editMethod = 'PATCH',
}: CrudFormModalProps) {
  const isEdit = !!id
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setValues(initial ? { ...initial } : {})
  }, [open, initial])

  function set(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      if (onSubmit) {
        await onSubmit(values)
      } else {
        const payload = serialize ? serialize(values) : values
        const url = isEdit ? `${endpoint}/${id}` : endpoint
        const method = isEdit ? editMethod : 'POST'
        const r = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Failed.')
      }
      toast.success(isEdit ? 'Updated.' : 'Created.')
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {children({ values, set, busy })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="gap-1.5">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {submitLabel || (isEdit ? 'Save changes' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
