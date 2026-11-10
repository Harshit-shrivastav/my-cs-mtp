// MY CS MTP — Admin subjects list + CRUD.
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
import { SubjectListActions } from '@/components/admin/subjects-actions'
import { Layers } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminSubjectsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const courseId = typeof sp.courseId === 'string' ? sp.courseId : ''
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const [courses, total, rows] = await Promise.all([
    db.course.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    db.subject.count({
      where: {
        ...(q ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] } : {}),
        ...(courseId ? { courseId } : {}),
      },
    }),
    db.subject.findMany({
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
        description: true,
        isActive: true,
        sortOrder: true,
        course: { select: { id: true, name: true } },
        _count: { select: { papers: true, planSubjects: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Subjects</h2>
        <p className="text-sm text-muted-foreground">Manage subjects within courses.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All subjects</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
                <AdminSearch placeholder="Search by name or slug…" />
              </Suspense>
              <AdminFilterSelect
                param="courseId"
                placeholder="All courses"
                options={courses.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
            <SubjectListActions courses={courses} initial={null} />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Layers className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No subjects found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create your first subject to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Plans</TableHead>
                  <TableHead>Papers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sort</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium leading-tight">{s.name}</div>
                      {s.description && <div className="text-xs text-muted-foreground line-clamp-1 max-w-[16rem]">{s.description}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.course.name}</TableCell>
                    <TableCell className="tabular-nums">{s._count.planSubjects}</TableCell>
                    <TableCell className="tabular-nums">{s._count.papers}</TableCell>
                    <TableCell>
                      {s.isActive ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.sortOrder}</TableCell>
                    <TableCell className="text-right">
                      <SubjectListActions courses={courses} initial={s} />
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
