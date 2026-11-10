// MY CS MTP — Admin assignments list + assign examiner + evaluate.
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
import { AdminFilterSelect, PaginationControls } from '@/components/admin/pagination-controls'
import { Suspense } from 'react'
import { AssignExaminerActions } from '@/components/admin/assignments-actions'
import { ClipboardCheck, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminAssignmentsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const courseId = typeof sp.courseId === 'string' ? sp.courseId : ''
  const subjectId = typeof sp.subjectId === 'string' ? sp.subjectId : ''
  const status = typeof sp.status === 'string' ? sp.status : ''
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const where: any = {
    ...(courseId ? { paper: { courseId } } : {}),
    ...(subjectId ? { paper: { subjectId } } : {}),
    ...(status ? { status } : {}),
    ...(q ? {
      OR: [
        { student: { name: { contains: q } } },
        { student: { email: { contains: q } } },
        { paper: { title: { contains: q } } },
      ],
    } : {}),
  }

  const [courses, subjects, examiners, total, rows] = await Promise.all([
    db.course.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    db.subject.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, courseId: true } }),
    db.user.findMany({
      where: { role: 'EXAMINER' },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        examinerPapers: { select: { paperId: true } },
        examinerSubjects: { select: { subjectId: true } },
      },
    }),
    db.assignment.count({ where }),
    db.assignment.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        marks: true,
        maxMarks: true,
        submittedAt: true,
        evaluatedAt: true,
        student: { select: { id: true, name: true, email: true } },
        paper: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
            courseId: true,
            subjectId: true,
            subject: { select: { id: true, name: true } },
            course: { select: { id: true, name: true } },
          },
        },
        examiner: { select: { id: true, name: true, email: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const subjectOptions = (courseId ? subjects.filter((s) => s.courseId === courseId) : subjects).map((s) => ({ value: s.id, label: s.name }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Assignments</h2>
        <p className="text-sm text-muted-foreground">Assign examiners and evaluate submissions.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All assignments</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
              <AdminSearch placeholder="Search by student, email, or paper…" />
            </Suspense>
            <AdminFilterSelect param="courseId" placeholder="All courses" options={courses.map((c) => ({ value: c.id, label: c.name }))} />
            <AdminFilterSelect param="subjectId" placeholder="All subjects" options={subjectOptions} />
            <AdminFilterSelect
              param="status"
              placeholder="All statuses"
              options={[
                { value: 'SUBMITTED', label: 'Submitted' },
                { value: 'ASSIGNED', label: 'Assigned' },
                { value: 'UNDER_EVALUATION', label: 'Under evaluation' },
                { value: 'EVALUATED', label: 'Evaluated' },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No assignments found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Paper</TableHead>
                  <TableHead className="hidden md:table-cell">Subject</TableHead>
                  <TableHead className="hidden lg:table-cell">Course</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Examiner</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium leading-tight">{a.student.name || a.student.email.split('@')[0]}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[12rem]">{a.student.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium leading-tight">{a.paper.title}</div>
                      <div className="text-xs text-muted-foreground">{a.paper.totalMarks} marks</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{a.paper.subject.name}</TableCell>
                    <TableCell className="hidden lg:table-cell">{a.paper.course.name}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {a.submittedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={a.status} />
                        {a.status === 'EVALUATED' && a.marks != null && (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {a.marks}/{a.maxMarks ?? a.paper.totalMarks}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {a.examiner?.name || a.examiner?.email || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <AssignExaminerActions
                          assignmentId={a.id}
                          paperId={a.paper.id}
                          paperSubjectId={a.paper.subjectId}
                          paperCourseId={a.paper.courseId}
                          examiners={examiners}
                          currentExaminerId={a.examiner?.id}
                        />
                        <Button asChild size="sm" variant="outline" className="gap-1">
                          <Link href={`/admin/assignments/${a.id}/evaluate`}>
                            {a.status === 'EVALUATED' ? 'View' : 'Evaluate'}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
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

function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    SUBMITTED: 'bg-blue-100 text-blue-700 border-blue-200',
    ASSIGNED: 'bg-amber-100 text-amber-800 border-amber-200',
    UNDER_EVALUATION: 'bg-amber-100 text-amber-800 border-amber-200',
    EVALUATED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  }
  return <Badge variant="outline" className={tone[status] || ''}>{status}</Badge>
}
