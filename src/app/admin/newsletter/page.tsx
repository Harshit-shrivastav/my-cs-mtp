// MY CS MTP — Admin newsletter page: subscribers, compose & send, send log.
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminSearch } from '@/components/admin/admin-search'
import { PaginationControls } from '@/components/admin/pagination-controls'
import { SubscriberRowActions, NewsletterComposeForm, BroadcastForm } from '@/components/admin/newsletter-actions'
import { Suspense } from 'react'
import { Mail, Send, ScrollText, Inbox } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminNewsletterPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const logPageRaw = typeof sp.logPage === 'string' ? parseInt(sp.logPage, 10) : 1
  const logPage = Number.isFinite(logPageRaw) && logPageRaw > 0 ? logPageRaw : 1

  const where = q ? { email: { contains: q } } : {}

  const [total, activeCount, rows, logTotal, logs, courses, allStudentsCount, courseGroups] =
    await Promise.all([
      db.newsletterSubscriber.count({ where }),
      db.newsletterSubscriber.count({ where: { isActive: true } }),
      db.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          email: true,
          isActive: true,
          source: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
        },
      }),
      db.newsletterLog.count(),
      db.newsletterLog.findMany({
        orderBy: { sentAt: 'desc' },
        skip: (logPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: { id: true, subject: true, body: true, recipientCount: true, sentAt: true },
      }),
      db.course.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
      db.user.count({ where: { role: 'STUDENT', isBlocked: false } }),
      db.user.groupBy({
        by: ['courseId'],
        where: { role: 'STUDENT', isBlocked: false, courseId: { not: null } },
        _count: { _all: true },
      }),
    ])

  const courseCounts: Record<string, number> = {}
  for (const g of courseGroups) {
    if (g.courseId) courseCounts[g.courseId] = g._count._all
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const logTotalPages = Math.max(1, Math.ceil(logTotal / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Newsletter</h2>
        <p className="text-sm text-muted-foreground">
          Subscribers, composing broadcasts and the send history.
        </p>
      </div>

      <Tabs defaultValue="subscribers">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto">
          <TabsTrigger value="subscribers" className="gap-1.5">
            <Inbox className="h-3.5 w-3.5" /> Subscribers
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Compose &amp; send
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5">
            <ScrollText className="h-3.5 w-3.5" /> Send log
          </TabsTrigger>
        </TabsList>

        {/* ------------------------- Subscribers ------------------------- */}
        <TabsContent value="subscribers" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Subscribers</CardTitle>
              <CardDescription>
                {total} total · {activeCount} active · showing page {page} of {totalPages}.
              </CardDescription>
              <div className="mt-2">
                <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
                  <AdminSearch placeholder="Search by email…" />
                </Suspense>
              </div>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold">No subscribers found.</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Newsletter sign-ups from the site will appear here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium break-all">{s.email}</TableCell>
                        <TableCell className="text-muted-foreground">{s.user?.name ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{s.source ?? '—'}</TableCell>
                        <TableCell>
                          {s.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <SubscriberRowActions id={s.id} email={s.email} isActive={s.isActive} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <PaginationControls page={page} totalPages={totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------ Compose & send ------------------------ */}
        <TabsContent value="compose" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2 items-start">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  Newsletter — active subscribers
                </CardTitle>
                <CardDescription>
                  Sends to all <strong>{activeCount}</strong> active newsletter subscribers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeCount === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active subscribers yet — emails cannot be sent to an empty list.
                  </p>
                ) : (
                  <NewsletterComposeForm activeSubscriberCount={activeCount} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Broadcast to students
                </CardTitle>
                <CardDescription>
                  Emails matching active, non-blocked student accounts directly ({allStudentsCount} total).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BroadcastForm courses={courses} allStudentsCount={allStudentsCount} courseCounts={courseCounts} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --------------------------- Send log --------------------------- */}
        <TabsContent value="log" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Send log</CardTitle>
              <CardDescription>
                {logTotal} sends recorded · newest first · showing page {logPage} of {logTotalPages}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <ScrollText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold">No sends recorded yet.</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Every newsletter or broadcast send is logged here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Body preview</TableHead>
                      <TableHead className="text-right">Recipients</TableHead>
                      <TableHead className="text-right">Sent at</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.subject}</TableCell>
                        <TableCell className="text-muted-foreground text-xs line-clamp-2 max-w-xs">
                          {l.body}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{l.recipientCount}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {l.sentAt.toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <PaginationControls page={logPage} totalPages={logTotalPages} paramName="logPage" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
