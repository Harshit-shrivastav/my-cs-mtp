'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CrudForm, type FieldDef } from '@/components/admin/crud-form'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface CrudActionsProps {
  endpoint: string
  fields: FieldDef[]
  title: string
  description?: string
  initial?: Record<string, any> | null
  idField?: string
  submitLabel?: string
  /** Optional pre-fill from a value */
}

export function CrudActions({
  endpoint,
  fields,
  title,
  description,
  initial = null,
  idField = 'id',
  submitLabel,
}: CrudActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const isEdit = !!initial

  return (
    <>
      <Button
        size="sm"
        variant={isEdit ? 'outline' : 'default'}
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        {isEdit ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {isEdit ? 'Edit' : 'Create'}
      </Button>
      <CrudForm
        open={open}
        onOpenChange={setOpen}
        endpoint={endpoint}
        initial={initial}
        idField={idField}
        fields={fields}
        title={title}
        description={description}
        submitLabel={submitLabel}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}

export function CrudDelete({
  endpoint,
  id,
  label,
  description,
  onSuccess,
}: {
  endpoint: string
  id: string
  label?: string
  description?: string
  onSuccess?: () => void
}) {
  const router = useRouter()
  return (
    <ConfirmDialog
      trigger={
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {label || 'Delete'}
        </Button>
      }
      title={label || 'Delete?'}
      description={description || 'This action cannot be undone.'}
      confirmLabel="Delete"
      onConfirm={async () => {
        const r = await fetch(`${endpoint}/${id}`, { method: 'DELETE' })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Failed.')
        toast.success('Deleted.')
        if (onSuccess) onSuccess()
        else router.refresh()
      }}
    />
  )
}
