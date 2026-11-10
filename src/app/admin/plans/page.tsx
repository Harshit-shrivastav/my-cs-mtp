// MY CS MTP — Admin plans list + CRUD.
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
import { PlanListActions } from '@/components/admin/plans-actions'
import { ClipboardList } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminPlansPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const courseId = typeof sp.courseId === 'string' ? sp.courseId : ''
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const [courses, total, rows] = await Promise.all([
    db.course.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    db.plan.count({
      where: {
        ...(q ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] } : {}),
        ...(courseId ? { courseId } : {}),
      },
    }),
    db.plan.findMany({
      where: {
        ...(q ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] } : {}),
        ...(courseId ? { courseId } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        sortOrder: true,
        scheduleFileKey: true,
        course: { select: { id: true, name: true } },
        _count: { select: { planSubjects: true, papers: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Plans</h2>
        <p className="text-sm text-muted-foreground">Manage plans within courses.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All plans</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center">
            <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
              <AdminSearch placeholder="Search by name or slug…" />
            </Suspense>
            <AdminFilterSelect
              param="courseId"
              placeholder="All courses"
              options={courses.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No plans found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create your first plan to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Papers</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sort</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.course.name}</TableCell>
                    <TableCell className="tabular-nums">{p._count.planSubjects}</TableCell>
                    <TableCell className="tabular-nums">{p._count.papers}</TableCell>
                    <TableCell className="text-xs">
                      {p.scheduleFileKey ? <Badge variant="outline">Uploaded</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {p.isActive ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.sortOrder}</TableCell>
                    <TableCell className="text-right">
                      <PlanListActions plan={p} courses={courses} />
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
