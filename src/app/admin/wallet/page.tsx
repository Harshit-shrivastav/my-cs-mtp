// MY CS MTP — Admin wallet list. All students with balances + credit/debit/bulk actions.
import { Suspense } from 'react'
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
import { PaginationControls } from '@/components/admin/pagination-controls'
import { WalletRowActions, WalletBulkCreditButton } from '@/components/admin/wallet-actions'
import { formatCurrency } from '@/lib/utils-extra'
import { Wallet } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminWalletPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const where = {
    role: 'STUDENT' as const,
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
  }

  const [courses, total, users] = await Promise.all([
    db.course.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
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
        isBlocked: true,
        wallet: {
          select: {
            id: true,
            balance: true,
            updatedAt: true,
            _count: { select: { transactions: true } },
          },
        },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Wallets</h2>
        <p className="text-sm text-muted-foreground">Student wallet balances — credit, debit, and bulk credits.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All student wallets</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
              <AdminSearch placeholder="Search by student name or email…" />
            </Suspense>
            <WalletBulkCreditButton courses={courses} />
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No students found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last wallet update</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const displayName = u.name || u.email.split('@')[0]
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.wallet ? (
                            <a href={`/admin/wallet/${u.wallet.id}`} className="hover:underline">
                              {displayName}
                            </a>
                          ) : (
                            displayName
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {u.wallet ? formatCurrency(u.wallet.balance) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {u.wallet?._count.transactions ?? 0}
                        </TableCell>
                        <TableCell>
                          {u.isBlocked ? (
                            <Badge variant="destructive">Blocked</Badge>
                          ) : (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {u.wallet
                            ? u.wallet.updatedAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <WalletRowActions
                            userId={u.id}
                            walletId={u.wallet?.id ?? null}
                            studentName={`${displayName} (${u.email})`}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <PaginationControls page={page} totalPages={totalPages} />
        </CardContent>
      </Card>
    </div>
  )
}
