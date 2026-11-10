// MY CS MTP — Admin mentorship list + update.
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
import { MentorshipRowActions } from '@/components/admin/mentorship-actions'
import { CalendarClock } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminMentorshipPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const status = typeof sp.status === 'string' ? sp.status : ''
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const where: any = {
    ...(q ? {
      OR: [
        { topic: { contains: q } },
        { student: { name: { contains: q } } },
        { student: { email: { contains: q } } },
      ],
    } : {}),
    ...(status ? { status } : {}),
  }

  const [total, rows] = await Promise.all([
    db.mentorship.count({ where }),
    db.mentorship.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        topic: true,
        notes: true,
        status: true,
        mentorName: true,
        requestedAt: true,
        updatedAt: true,
        student: { select: { id: true, name: true, email: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Mentorship</h2>
        <p className="text-sm text-muted-foreground">Review and assign mentorship requests.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All requests</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center">
            <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
              <AdminSearch placeholder="Search by topic, student name, or email…" />
            </Suspense>
            <AdminFilterSelect
              param="status"
              placeholder="All statuses"
              options={[
                { value: 'REQUESTED', label: 'Requested' },
                { value: 'ASSIGNED', label: 'Assigned' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <CalendarClock className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No requests found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium leading-tight">{m.student.name || m.student.email.split('@')[0]}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[14rem]">{m.student.email}</div>
                    </TableCell>
                    <TableCell className="font-medium">{m.topic}</TableCell>
                    <TableCell>
                      <StatusBadge status={m.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.mentorName || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {m.requestedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <MentorshipRowActions request={m} />
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
    REQUESTED: 'bg-blue-100 text-blue-700 border-blue-200',
    ASSIGNED: 'bg-amber-100 text-amber-800 border-amber-200',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    CANCELLED: 'bg-muted text-muted-foreground',
  }
  return <Badge variant="outline" className={tone[status] || ''}>{status}</Badge>
}
