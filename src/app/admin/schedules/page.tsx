// MY CS MTP — Admin schedules list + CRUD.
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
import { ScheduleActions, ScheduleDelete, ScheduleNamesManager } from '@/components/admin/schedules-actions'
import { CalendarDays } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminSchedulesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const courseId = typeof sp.courseId === 'string' ? sp.courseId : ''
  const planId = typeof sp.planId === 'string' ? sp.planId : ''
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const where: any = {
    ...(q ? { title: { contains: q } } : {}),
    ...(courseId ? { courseId } : {}),
    ...(planId ? { planId } : {}),
  }

  const [courses, plans, scheduleNames, total, rows] = await Promise.all([
    db.course.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    db.plan.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, courseId: true } }),
    db.scheduleName.findMany({ select: { id: true, name: true, planId: true } }),
    db.schedule.count({ where }),
    db.schedule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        planId: true,
        courseId: true,
        scheduleNameId: true,
        fileKey: true,
        isPublic: true,
        publishedAt: true,
        createdAt: true,
        plan: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        scheduleName: { select: { id: true, name: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const planOptions = (courseId ? plans.filter((p) => p.courseId === courseId) : plans).map((p) => ({ value: p.id, label: p.name }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Schedules</h2>
        <p className="text-sm text-muted-foreground">Manage schedules + schedule names (per plan).</p>
      </div>

      {/* Schedule Names manager */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Schedule names</CardTitle>
          <CardDescription>Schedule names belong to plans and can be assigned to individual schedule entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleNamesManager plans={plans} initialNames={scheduleNames} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All schedules</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
                <AdminSearch placeholder="Search by title…" />
              </Suspense>
              <AdminFilterSelect param="courseId" placeholder="All courses" options={courses.map((c) => ({ value: c.id, label: c.name }))} />
              <AdminFilterSelect param="planId" placeholder="All plans" options={planOptions} />
            </div>
            <ScheduleActions courses={courses} plans={plans} scheduleNames={scheduleNames} initial={null} />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No schedules found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create your first schedule to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Schedule name</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell className="text-muted-foreground">{s.course.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.plan.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.scheduleName?.name ?? '—'}</TableCell>
                    <TableCell>
                      {s.fileKey ? <Badge variant="outline">Uploaded</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {s.isPublic ? <Badge variant="outline">Public</Badge> : <Badge variant="secondary">Private</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {s.publishedAt ? s.publishedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ScheduleActions
                          courses={courses}
                          plans={plans}
                          scheduleNames={scheduleNames}
                          initial={s}
                        />
                        <ScheduleDelete id={s.id} title={s.title} />
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
