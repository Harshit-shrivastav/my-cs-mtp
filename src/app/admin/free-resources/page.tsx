// MY CS MTP — Admin free resources list + CRUD.
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
import { AdminSearch } from '@/components/admin/admin-search'
import { AdminFilterSelect, PaginationControls } from '@/components/admin/pagination-controls'
import { Suspense } from 'react'
import { FreeResourceActions } from '@/components/admin/free-resources-actions'
import { Gift } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminFreeResourcesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const courseId = typeof sp.courseId === 'string' ? sp.courseId : ''
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const where: any = {
    ...(q ? { title: { contains: q } } : {}),
    ...(courseId ? { courseId } : {}),
  }

  const [courses, total, rows] = await Promise.all([
    db.course.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    db.freeResource.count({ where }),
    db.freeResource.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        courseId: true,
        fileKey: true,
        imageKey: true,
        imageAlt: true,
        isPublic: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        course: { select: { id: true, name: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Free Resources</h2>
        <p className="text-sm text-muted-foreground">Manage publicly-available free resources.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All free resources</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
                <AdminSearch placeholder="Search by title…" />
              </Suspense>
              <AdminFilterSelect
                param="courseId"
                placeholder="All courses"
                options={courses.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
            <FreeResourceActions courses={courses} initial={null} />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Gift className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No free resources found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Upload your first free resource to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sort</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="text-muted-foreground">{r.course?.name ?? '—'}</TableCell>
                    <TableCell>
                      {r.isPublic ? <Badge variant="outline">Public</Badge> : <Badge variant="secondary">Private</Badge>}
                    </TableCell>
                    <TableCell>
                      {r.fileKey ? <Badge variant="outline">Uploaded</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {r.isActive ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.sortOrder}</TableCell>
                    <TableCell className="text-right">
                      <FreeResourceActions courses={courses} initial={r} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <PaginationControls page={page} totalPages={totalPages} />
        </CardContent>
      </Card>
    </div>
  )
}
