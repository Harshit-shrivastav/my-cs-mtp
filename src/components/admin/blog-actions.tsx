// MY CS MTP — Admin blog list + CRUD actions (client).
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CrudDelete } from '@/components/admin/crud-actions'
import { Pencil, ExternalLink } from 'lucide-react'

export function BlogRowActions({
  post,
}: {
  post: { id: string; slug: string; status: string; title: string }
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      {post.status === 'PUBLISHED' && (
        <Button asChild size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
          <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </a>
        </Button>
      )}
      <Button asChild size="sm" variant="outline" className="gap-1.5">
        <Link href={`/admin/blog/${post.id}`}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
      </Button>
      <CrudDelete
        endpoint="/api/admin/blog"
        id={post.id}
        label="Delete"
        description={
          <>
            Delete the blog post <strong>{post.title}</strong>? The public URL
            <span className="font-mono"> /blog/{post.slug}</span> will stop working immediately.
            This action cannot be undone.
          </>
        }
      />
    </div>
  )
}
