// MY CS MTP — Admin papers list + CRUD.
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
import { PapersActions, PapersDelete } from '@/components/admin/papers-actions'
import { FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminPapersPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const courseId = typeof sp.courseId === 'string' ? sp.courseId : ''
  const planId = typeof sp.planId === 'string' ? sp.planId : ''
  const subjectId = typeof sp.subjectId === 'string' ? sp.subjectId : ''
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  // Build the where filter
  const where: any = {
    ...(q ? { OR: [{ title: { contains: q } }, { slug: { contains: q } }] } : {}),
    ...(courseId ? { courseId } : {}),
    ...(planId ? { planId } : {}),
    ...(subjectId ? { subjectId } : {}),
  }

  const [courses, plans, subjects, total, rows] = await Promise.all([
    db.course.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    db.plan.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, courseId: true } }),
    db.subject.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, courseId: true } }),
    db.testPaper.count({ where }),
    db.testPaper.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        courseId: true,
        planId: true,
        subjectId: true,
        description: true,
        questionFileKey: true,
        answerFileKey: true,
        allowAnswerDownload: true,
        scheduledDate: true,
        totalMarks: true,
        isActive: true,
        sortOrder: true,
        course: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        _count: { select: { assignments: true } },
      },
    }),
  ])

  // All plan-subject links (so the form can validate)
  const planSubjectLinks = await db.planSubject.findMany({ select: { planId: true, subjectId: true } })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Plan filter options: filtered by selected course
  const planOptions = (courseId ? plans.filter((p) => p.courseId === courseId) : plans).map((p) => ({
    value: p.id,
    label: p.name,
  }))
  // Subject filter options: filtered by selected course
  const subjectOptions = (courseId ? subjects.filter((s) => s.courseId === courseId) : subjects).map((s) => ({
    value: s.id,
    label: s.name,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Papers</h2>
        <p className="text-sm text-muted-foreground">Manage test papers.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All papers</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
                <AdminSearch placeholder="Search by title or slug…" />
              </Suspense>
              <AdminFilterSelect param="courseId" placeholder="All courses" options={courses.map((c) => ({ value: c.id, label: c.name }))} />
              <AdminFilterSelect param="planId" placeholder="All plans" options={planOptions} />
              <AdminFilterSelect param="subjectId" placeholder="All subjects" options={subjectOptions} />
            </div>
            <PapersActions
              courses={courses}
              plans={plans}
              subjects={subjects}
              planSubjectLinks={planSubjectLinks}
              initial={null}
            />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No papers found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create your first test paper to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Subs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground">{p.course.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.plan.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.subject.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.totalMarks}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {p.scheduledDate ? p.scheduledDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">{p._count.assignments}</TableCell>
                    <TableCell>
                      {p.isActive ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <PapersActions
                          courses={courses}
                          plans={plans}
                          subjects={subjects}
                          planSubjectLinks={planSubjectLinks}
                          initial={{
                            id: p.id,
                            title: p.title,
                            slug: p.slug,
                            courseId: p.courseId,
                            planId: p.planId,
                            subjectId: p.subjectId,
                            description: p.description,
                            questionFileKey: p.questionFileKey,
                            answerFileKey: p.answerFileKey,
                            allowAnswerDownload: p.allowAnswerDownload,
                            scheduledDate: p.scheduledDate ? p.scheduledDate.toISOString() : null,
                            totalMarks: p.totalMarks,
                            isActive: p.isActive,
                            sortOrder: p.sortOrder,
                          }}
                        />
                        <PapersDelete id={p.id} title={p.title} />
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
