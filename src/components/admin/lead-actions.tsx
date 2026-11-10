// MY CS MTP — Admin marketing/leads row actions (client).
'use client'

import { CrudDelete } from '@/components/admin/crud-actions'

export function LeadRowActions({ lead }: { lead: { id: string; name: string; email: string; mobile: string } }) {
  const who = lead.name || lead.email || lead.mobile || 'this lead'
  return (
    <CrudDelete
      endpoint="/api/admin/leads"
      id={lead.id}
      label="Delete"
      description={
        <>
          Delete the lead from <strong>{who}</strong>? This action cannot be undone.
        </>
      }
    />
  )
}
