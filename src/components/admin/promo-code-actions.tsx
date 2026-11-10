'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { CrudActions } from '@/components/admin/crud-actions'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import type { FieldDef } from '@/components/admin/crud-form'

export const PROMO_FIELDS: FieldDef[] = [
  {
    name: 'code',
    label: 'Code',
    type: 'text',
    required: true,
    placeholder: 'e.g. DIWALI50',
    helpText: 'Stored uppercase — spaces are stripped automatically.',
  },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    required: true,
    options: [
      { value: 'PERCENT', label: 'Percent (%)' },
      { value: 'FLAT', label: 'Flat (₹)' },
    ],
  },
  {
    name: 'value',
    label: 'Value',
    type: 'number',
    required: true,
    step: '0.01',
    min: '0',
    placeholder: 'e.g. 10 or 200',
    helpText: 'Percent codes: 1–100. Flat codes: ₹ amount.',
  },
  { name: 'minAmount', label: 'Min cart amount (₹)', type: 'number', step: '0.01', min: '0', placeholder: '0' },
  {
    name: 'maxDiscount',
    label: 'Max discount (₹)',
    type: 'number',
    step: '0.01',
    min: '0',
    placeholder: '0 = no cap',
    helpText: 'Caps the discount for percent codes.',
  },
  {
    name: 'usageLimit',
    label: 'Usage limit',
    type: 'number',
    step: '1',
    min: '0',
    placeholder: '0 = unlimited',
    helpText: '0 means unlimited redemptions.',
  },
  { name: 'startsAt', label: 'Starts at', type: 'date' },
  { name: 'endsAt', label: 'Ends at', type: 'date' },
  { name: 'isActive', label: 'Active', type: 'switch' },
]

export interface PromoRow {
  id: string
  code: string
  type: 'PERCENT' | 'FLAT'
  value: number
  minAmount: number
  maxDiscount: number
  usageLimit: number
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
}

export function PromoCreateButton() {
  return (
    <CrudActions
      endpoint="/api/admin/promo-codes"
      fields={PROMO_FIELDS}
      title="Create promo code"
      description="Add a new discount code for checkout."
      submitLabel="Create promo code"
    />
  )
}

export function PromoRowActions({ promo }: { promo: PromoRow }) {
  const router = useRouter()
  return (
    <div className="flex items-center justify-end gap-2">
      <CrudActions
        endpoint="/api/admin/promo-codes"
        fields={PROMO_FIELDS}
        title="Edit promo code"
        description={promo.code}
        initial={promo}
        submitLabel="Save changes"
      />
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        }
        title="Delete promo code?"
        description={
          <>
            Delete promo code <strong className="font-mono">{promo.code}</strong>? Orders that used it keep their
            records but the code will be unlinked. This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        successMessage="Promo code deleted."
        onConfirm={async () => {
          const r = await fetch(`/api/admin/promo-codes/${promo.id}`, { method: 'DELETE' })
          const data = await r.json().catch(() => ({}))
          if (!r.ok) throw new Error(data.error || 'Failed.')
          router.refresh()
        }}
      />
    </div>
  )
}
