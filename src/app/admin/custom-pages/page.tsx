// MY CS MTP — Admin custom pages list page.
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
import { PaginationControls } from '@/components/admin/pagination-controls'
import { CustomPageRowActions } from '@/components/admin/custom-page-actions'
import { FileEdit, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminCustomPagesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const where = q ? { OR: [{ title: { contains: q } }, { slug: { contains: q } }] } : {}

  const [total, rows] = await Promise.all([
    db.customPage.count({ where }),
    db.customPage.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        showInHeader: true,
        showInFooter: true,
        isActive: true,
        updatedAt: true,
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Custom Pages</h2>
          <p className="text-sm text-muted-foreground">
            Standalone pages (Terms, Privacy Policy, FAQs…) rendered at /{`{slug}`} with markdown content.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 self-start sm:self-auto">
          <Link href="/admin/custom-pages/new">
            <Plus className="h-4 w-4" />
            New page
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All pages</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
              <AdminSearch placeholder="Search by title or slug…" />
            </Suspense>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <FileEdit className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No custom pages found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first page — e.g. a Privacy Policy or Terms of Use.
              </p>
              <Button asChild size="sm" className="mt-4 gap-1.5">
                <Link href="/admin/custom-pages/new">
                  <Plus className="h-4 w-4" />
                  New page
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
                    <TableHead>Menus</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium max-w-[16rem]">
                        <div className="line-clamp-1">{p.title}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">/{p.slug}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {p.showInHeader && <Badge variant="outline" className="text-[11px] font-normal">Header</Badge>}
                          {p.showInFooter && <Badge variant="outline" className="text-[11px] font-normal">Footer</Badge>}
                          {!p.showInHeader && !p.showInFooter && (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.isActive ? (
                          <Badge variant="outline" className="gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(p.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <CustomPageRowActions
                          page={{ id: p.id, slug: p.slug, isActive: p.isActive, title: p.title }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
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

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
