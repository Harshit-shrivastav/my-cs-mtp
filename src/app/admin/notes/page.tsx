// MY CS MTP — Admin notes list + CRUD.
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
import { NoteLikeActions, NoteLikeDelete } from '@/components/admin/notes-actions'
import { NotebookPen } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminNotesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const courseId = typeof sp.courseId === 'string' ? sp.courseId : ''
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const where: any = {
    ...(q ? { title: { contains: q } } : {}),
    ...(courseId ? { courseId } : {}),
  }

  const [courses, plans, subjects, total, rows] = await Promise.all([
    db.course.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    db.plan.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, courseId: true } }),
    db.subject.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, courseId: true } }),
    db.note.count({ where }),
    db.note.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        courseId: true,
        planId: true,
        subjectId: true,
        fileKey: true,
        isActive: true,
        createdAt: true,
        course: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Notes</h2>
        <p className="text-sm text-muted-foreground">Manage notes / study material.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All notes</CardTitle>
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
            <NoteLikeActions
              courses={courses}
              plans={plans}
              subjects={subjects}
              initial={null}
              endpoint="/api/admin/notes"
              title="Note"
              description="Add a new note."
              keyPrefix="notes"
            />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <NotebookPen className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No notes found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Upload your first note to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell className="text-muted-foreground">{n.course.name}</TableCell>
                    <TableCell className="text-muted-foreground">{n.plan?.name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{n.subject?.name ?? '—'}</TableCell>
                    <TableCell>
                      {n.fileKey ? <Badge variant="outline">Uploaded</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {n.isActive ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <NoteLikeActions
                          courses={courses}
                          plans={plans}
                          subjects={subjects}
                          initial={{
                            id: n.id,
                            title: n.title,
                            description: n.description,
                            courseId: n.courseId,
                            planId: n.planId,
                            subjectId: n.subjectId,
                            fileKey: n.fileKey,
                            isActive: n.isActive,
                          }}
                          endpoint="/api/admin/notes"
                          title="Note"
                          description="Edit this note."
                          keyPrefix="notes"
                        />
                        <NoteLikeDelete id={n.id} title={n.title} endpoint="/api/admin/notes" />
                      </div>
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
