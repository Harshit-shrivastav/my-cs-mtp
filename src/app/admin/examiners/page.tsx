// MY CS MTP — Admin examiners list page.
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
import { PaginationControls } from '@/components/admin/pagination-controls'
import { CrudActions, CrudDelete } from '@/components/admin/crud-actions'
import { Suspense } from 'react'
import { UserCog } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminExaminersPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const where = {
    role: 'EXAMINER' as const,
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { mobile: { contains: q } },
          ],
        }
      : {}),
  }

  const [total, rows, courses] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        createdAt: true,
        courseId: true,
        course: { select: { id: true, name: true } },
        _count: { select: { examinerPapers: true, examinerSubjects: true } },
      },
    }),
    db.course.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  // Evaluated counts for the visible rows.
  const ids = rows.map((r) => r.id)
  const evalCounts = new Map<string, number>()
  if (ids.length > 0) {
    const grouped = await db.assignment.groupBy({
      by: ['examinerId'],
      where: { examinerId: { in: ids }, status: 'EVALUATED' },
      _count: { _all: true },
    })
    for (const g of grouped) {
      if (g.examinerId) evalCounts.set(g.examinerId, g._count._all)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const courseOptions = courses.map((c) => ({ value: c.id, label: c.name }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Examiners</h2>
        <p className="text-sm text-muted-foreground">
          Examiner accounts, their paper/subject scope and evaluation history.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All examiners</CardTitle>
          <CardDescription>
            {total} total · showing page {page} of {totalPages}.
          </CardDescription>
          <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
              <AdminSearch placeholder="Search by name, email or mobile…" />
            </Suspense>
            <CrudActions
              endpoint="/api/admin/examiners"
              fields={[
                { name: 'name', label: 'Name', type: 'text' as const, required: true, placeholder: 'e.g. Prof. Sharma' },
                { name: 'email', label: 'Email', type: 'email' as const, required: true, placeholder: 'examiner@mycsmtp.com' },
                { name: 'mobile', label: 'Mobile', type: 'text' as const, placeholder: '10-digit mobile' },
                {
                  name: 'password',
                  label: 'Password',
                  type: 'password' as const,
                  required: true,
                  helpText: 'At least 8 characters, with a letter and a number.',
                },
                {
                  name: 'courseId',
                  label: 'Course scope (optional)',
                  type: 'select' as const,
                  options: courseOptions,
                  selectPlaceholder: 'No specific course',
                },
              ]}
              title="Create examiner"
              description="Creates an EXAMINER login that can evaluate assigned answer sheets."
              submitLabel="Create examiner"
            />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <UserCog className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No examiners found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create an examiner account to start assigning papers and subjects.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Examiner</TableHead>
                  <TableHead>Course scope</TableHead>
                  <TableHead className="text-right">Papers</TableHead>
                  <TableHead className="text-right">Subjects</TableHead>
                  <TableHead className="text-right">Evaluations</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="font-medium leading-tight">{e.name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{e.email}</div>
                      {e.mobile && <div className="text-xs text-muted-foreground">{e.mobile}</div>}
                    </TableCell>
                    <TableCell>
                      {e.course ? <Badge variant="outline">{e.course.name}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{e._count.examinerPapers}</TableCell>
                    <TableCell className="text-right tabular-nums">{e._count.examinerSubjects}</TableCell>
                    <TableCell className="text-right tabular-nums">{evalCounts.get(e.id) || 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild size="sm" variant="outline" className="gap-1.5">
                          <Link href={`/admin/examiners/${e.id}`}>
                            <UserCog className="h-3.5 w-3.5" />
                            Manage
                          </Link>
                        </Button>
                        <CrudActions
                          endpoint="/api/admin/examiners"
                          fields={[
                            { name: 'name', label: 'Name', type: 'text' as const, required: true },
                            { name: 'mobile', label: 'Mobile', type: 'text' as const, placeholder: '10-digit mobile' },
                            {
                              name: 'courseId',
                              label: 'Course scope (optional)',
                              type: 'select' as const,
                              options: courseOptions,
                              selectPlaceholder: 'No specific course',
                            },
                          ]}
                          title="Edit examiner"
                          description="Update the examiner's name, mobile and course scope."
                          submitLabel="Save changes"
                          initial={{ id: e.id, name: e.name, mobile: e.mobile, courseId: e.courseId }}
                        />
                        <CrudDelete
                          endpoint="/api/admin/examiners"
                          id={e.id}
                          label="Delete"
                          description={`This will permanently delete ${e.name || e.email}. Their paper/subject assignments are removed and submitted evaluations stay in the system (unassigned). This action cannot be undone.`}
                        />
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
