// MY CS MTP — Admin marketing page: captured leads + sale popup configuration.
import { Suspense } from 'react'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
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
import { LeadRowActions } from '@/components/admin/lead-actions'
import { PopupConfigForm } from '@/components/admin/popup-config-form'
import { Download, UserPlus } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminMarketingPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { mobile: { contains: q } },
        ],
      }
    : {}

  const [total, rows, settings] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    getSettings(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Marketing / Leads</h2>
        <p className="text-sm text-muted-foreground">
          Leads captured from popups and public forms, plus the sale popup configuration.
        </p>
      </div>

      {/* Leads */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Leads</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
              <AdminSearch placeholder="Search by name, email or mobile…" />
            </Suspense>
            <Button asChild size="sm" variant="outline" className="gap-1.5 self-start sm:self-auto">
              <a href="/api/admin/leads/export" download>
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">{q ? 'No leads match your search.' : 'No leads captured yet.'}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Leads appear here when visitors submit popups or contact forms.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Course interest</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.email || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">{l.mobile || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.courseInterest || '—'}</TableCell>
                      <TableCell>
                        {l.source ? (
                          <Badge variant="outline" className="text-[11px] font-normal">{l.source}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[14rem]">
                        <div className="line-clamp-2 whitespace-pre-line">{l.message || '—'}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {fmtDateTime(l.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <LeadRowActions
                          lead={{ id: l.id, name: l.name || '', email: l.email || '', mobile: l.mobile || '' }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <PaginationControls page={page} totalPages={totalPages} />
        </CardContent>
      </Card>

      {/* Sale popup configuration */}
      <PopupConfigForm
        initial={{
          salePopupEnabled: settings.salePopupEnabled,
          salePopupTitle: settings.salePopupTitle,
          salePopupText: settings.salePopupText,
          salePopupImageKey: settings.salePopupImageKey,
          salePopupDelaySeconds: settings.salePopupDelaySeconds,
          salePopupFrequency: settings.salePopupFrequency,
        }}
      />
    </div>
  )
}

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
