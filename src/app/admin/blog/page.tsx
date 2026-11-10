// MY CS MTP — Admin blog list page.
import { Suspense } from 'react'
import Link from 'next/link'
import { db } from '@/lib/db'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AdminSearch } from '@/components/admin/admin-search'
import { PaginationControls, AdminFilterSelect } from '@/components/admin/pagination-controls'
import { BlogRowActions } from '@/components/admin/blog-actions'
import { Newspaper, Plus, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminBlogPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const statusParam = typeof sp.status === 'string' ? sp.status : ''
  const status = statusParam === 'DRAFT' || statusParam === 'PUBLISHED' ? statusParam : null
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const where = {
    ...(q ? { OR: [{ title: { contains: q } }, { slug: { contains: q } }] } : {}),
    ...(status ? { status } : {}),
  }

  const [total, rows] = await Promise.all([
    db.blogPost.count({ where }),
    db.blogPost.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        authorName: true,
        tags: true,
        publishedAt: true,
        aiGenerated: true,
        updatedAt: true,
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Blog</h2>
          <p className="text-sm text-muted-foreground">Write, publish and manage blog posts.</p>
        </div>
        <Button asChild size="sm" className="gap-1.5 self-start sm:self-auto">
          <Link href="/admin/blog/new">
            <Plus className="h-4 w-4" />
            New post
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All posts</CardTitle>
          <CardDescription>
            {total} total{status ? ` · filtered by ${status.toLowerCase()}` : ''} · showing page {page} of {totalPages}.
          </CardDescription>
          <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <AdminSearch placeholder="Search by title or slug…" />
                <AdminFilterSelect
                  param="status"
                  placeholder="All statuses"
                  value={status || ''}
                  options={[
                    { value: 'DRAFT', label: 'Drafts' },
                    { value: 'PUBLISHED', label: 'Published' },
                  ]}
                />
              </div>
            </Suspense>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Newspaper className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No blog posts found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first post — or generate a draft from a title.
              </p>
              <Button asChild size="sm" className="mt-4 gap-1.5">
                <Link href="/admin/blog/new">
                  <Plus className="h-4 w-4" />
                  New post
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => {
                    const tags = (p.tags || '').split(',').map((t) => t.trim()).filter(Boolean)
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="max-w-[18rem]">
                            <div className="font-medium leading-tight line-clamp-1">{p.title}</div>
                            {p.aiGenerated && (
                              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <Sparkles className="h-3 w-3" />
                                AI draft
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.slug}</TableCell>
                        <TableCell>
                          {p.status === 'PUBLISHED' ? (
                            <Badge variant="outline" className="gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.authorName || '—'}</TableCell>
                        <TableCell>
                          {tags.length ? (
                            <div className="flex flex-wrap gap-1 max-w-[12rem]">
                              {tags.slice(0, 2).map((t) => (
                                <Badge key={t} variant="outline" className="text-[11px] font-normal">{t}</Badge>
                              ))}
                              {tags.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{tags.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(p.publishedAt)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(p.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <BlogRowActions post={{ id: p.id, slug: p.slug, status: p.status, title: p.title }} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <PaginationControls page={page} totalPages={totalPages} />
        </CardContent>
      </Card>
    </div>
  )
}

function fmtDate(d: Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
