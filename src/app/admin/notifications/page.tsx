// MY CS MTP — Admin notifications page: create/send + list + delete.
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
import { PaginationControls } from '@/components/admin/pagination-controls'
import { CreateNotificationDialog, DeleteNotificationButton } from '@/components/admin/notifications-actions'
import { Bell } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminNotificationsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const [total, notifRows, courses, students, allStudentsCount, courseGroups] = await Promise.all([
    db.notification.count(),
    db.notification.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { recipients: true } } },
    }),
    db.course.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    db.user.findMany({
      where: { role: 'STUDENT' },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { id: true, name: true, email: true },
    }),
    db.user.count({ where: { role: 'STUDENT', isBlocked: false } }),
    db.user.groupBy({
      by: ['courseId'],
      where: { role: 'STUDENT', isBlocked: false, courseId: { not: null } },
      _count: { _all: true },
    }),
  ])

  // courseId/targetUserId are plain strings (no relations on the model) —
  // resolve display names in bulk.
  const courseIds = Array.from(new Set(notifRows.map((r) => r.courseId).filter(Boolean))) as string[]
  const targetIds = Array.from(new Set(notifRows.map((r) => r.targetUserId).filter(Boolean))) as string[]
  const [notifCourses, notifTargets] = await Promise.all([
    courseIds.length
      ? db.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    targetIds.length
      ? db.user.findMany({ where: { id: { in: targetIds } }, select: { id: true, name: true, email: true } })
      : Promise.resolve([]),
  ])
  const courseById = new Map(notifCourses.map((c) => [c.id, c]))
  const targetById = new Map(notifTargets.map((t) => [t.id, t]))

  const rows = notifRows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    audience: r.audience,
    createdAt: r.createdAt,
    course: r.courseId ? courseById.get(r.courseId) ?? null : null,
    targetUser: r.targetUserId ? targetById.get(r.targetUserId) ?? null : null,
    recipientCount: r._count.recipients,
  }))

  const courseCounts: Record<string, number> = {}
  for (const g of courseGroups) {
    if (g.courseId) courseCounts[g.courseId] = g._count._all
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function audienceLabel(r: (typeof rows)[number]) {
    if (r.audience === 'ALL') return 'All students'
    if (r.audience === 'COURSE') return `Course · ${r.course?.name ?? '—'}`
    return `Student · ${r.targetUser?.name || r.targetUser?.email || '—'}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            In-app notifications shown on the student dashboard.
          </p>
        </div>
        <CreateNotificationDialog
          courses={courses}
          students={students}
          allStudentsCount={allStudentsCount}
          courseCounts={courseCounts}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sent notifications</CardTitle>
          <CardDescription>
            {total} total · newest first · showing page {page} of {totalPages}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No notifications sent yet.</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Use “New notification” to reach all students, a course or a single student.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Notification</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <div className="font-medium leading-tight">{n.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 max-w-md">{n.message}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{audienceLabel(n)}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{n.recipientCount}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {n.createdAt.toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteNotificationButton id={n.id} title={n.title} />
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
