// MY CS MTP — Admin: wallet detail. Balance, full transaction history, adjust actions.
import Link from 'next/link'
import { notFound } from 'next/navigation'
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
import { WalletAdjustButton } from '@/components/admin/wallet-actions'
import { formatCurrency } from '@/lib/utils-extra'
import { ArrowLeft, User } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminWalletDetailPage({ params }: PageProps) {
  const { id } = await params

  const wallet = await db.wallet.findUnique({
    where: { id },
    select: {
      id: true,
      balance: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true, isBlocked: true } },
      transactions: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          type: true,
          reason: true,
          reference: true,
          createdAt: true,
        },
      },
    },
  })
  if (!wallet) notFound()

  const displayName = wallet.user.name || wallet.user.email.split('@')[0]
  const dt = (d: Date) => d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  const credits = wallet.transactions.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0)
  const debits = wallet.transactions.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Wallet — {displayName}</h2>
          <p className="text-sm text-muted-foreground">
            {wallet.user.email} · wallet ID <span className="font-mono">{wallet.id}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WalletAdjustButton
            walletId={wallet.id}
            studentName={`${displayName} (${wallet.user.email})`}
            mode="CREDIT"
          />
          <WalletAdjustButton
            walletId={wallet.id}
            studentName={`${displayName} (${wallet.user.email})`}
            mode="DEBIT"
          />
        </div>
      </div>

      {/* Balance summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Balance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-end gap-6">
          <div>
            <div className="text-3xl font-bold tabular-nums">{formatCurrency(wallet.balance)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Last updated {dt(wallet.updatedAt)} · created {dt(wallet.createdAt)}
            </div>
          </div>
          <div className="flex gap-6 sm:ml-auto">
            <div>
              <div className="text-xs text-muted-foreground">Total credited</div>
              <div className="text-lg font-semibold tabular-nums text-green-700">+{formatCurrency(credits)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total debited</div>
              <div className="text-lg font-semibold tabular-nums">−{formatCurrency(debits)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transactions</CardTitle>
          <CardDescription>{wallet.transactions.length} recorded transaction(s).</CardDescription>
        </CardHeader>
        <CardContent>
          {wallet.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallet.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{dt(t.createdAt)}</TableCell>
                      <TableCell>
                        {t.type === 'CREDIT' ? (
                          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">CREDIT</Badge>
                        ) : (
                          <Badge variant="secondary">DEBIT</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.type === 'CREDIT' ? '+' : '−'}
                        {formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[20rem] truncate">{t.reason}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{t.reference || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/wallet">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to wallets
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/admin/students/${wallet.user.id}`}>
            <User className="h-3.5 w-3.5" />
            Open student profile
          </Link>
        </Button>
      </div>
    </div>
  )
}
