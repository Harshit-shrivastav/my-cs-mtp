// MY CS MTP — Admin custom pages list + row actions (client).
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CrudDelete } from '@/components/admin/crud-actions'
import { Pencil, ExternalLink } from 'lucide-react'

export function CustomPageRowActions({
  page,
}: {
  page: { id: string; slug: string; isActive: boolean; title: string }
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      {page.isActive && (
        <Button asChild size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
          <a href={`/${page.slug}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </a>
        </Button>
      )}
      <Button asChild size="sm" variant="outline" className="gap-1.5">
        <Link href={`/admin/custom-pages/${page.id}`}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
      </Button>
      <CrudDelete
        endpoint="/api/admin/custom-pages"
        id={page.id}
        label="Delete"
        description={
          <>
            Delete the custom page <strong>{page.title}</strong>? The public page at
            <span className="font-mono"> /{page.slug}</span> disappears immediately and any
            links to it will start returning 404. This action cannot be undone.
          </>
        }
      />
    </div>
  )
}
