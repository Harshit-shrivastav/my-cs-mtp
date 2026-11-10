// MY CS MTP — Admin students list. Server-side pagination + search + course filter.
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminSearch } from '@/components/admin/admin-search'
import { AdminFilterSelect, PaginationControls } from '@/components/admin/pagination-controls'
import { StudentsTableActions } from '@/components/admin/students-actions'
import { GlobalRevokeAllButton } from '@/components/admin/student-purchases'
import { Suspense } from 'react'
import { Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminStudentsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const courseId = typeof sp.courseId === 'string' ? sp.courseId : ''
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const [courses, total, rows] = await Promise.all([
    db.course.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    db.user.count({
      where: {
        role: 'STUDENT',
        ...(q
          ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] }
          : {}),
        ...(courseId ? { courseId } : {}),
      },
    }),
    db.user.findMany({
      where: {
        role: 'STUDENT',
        ...(q
          ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] }
          : {}),
        ...(courseId ? { courseId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        isBlocked: true,
        createdAt: true,
        course: { select: { id: true, name: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Students</h2>
        <p className="text-sm text-muted-foreground">Manage student accounts.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All students</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
                <AdminSearch placeholder="Search by name or email…" />
              </Suspense>
              <AdminFilterSelect
                param="courseId"
                placeholder="All courses"
                options={courses.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
            <GlobalRevokeAllButton />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No students found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/students/${u.id}`} className="hover:underline">
                        {u.name || u.email.split('@')[0]}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{u.mobile || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{u.course?.name ?? '—'}</TableCell>
                    <TableCell>
                      {u.isBlocked ? (
                        <Badge variant="destructive">Blocked</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {u.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/students/${u.id}`}>View</Link>
                        </Button>
                        <StudentsTableActions user={{ id: u.id, isBlocked: u.isBlocked, name: u.name, email: u.email }} />
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
