// MY CS MTP — Student wallet page: balance + transaction history.
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getCurrentUser } from '@/lib/server-auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils-extra'
import { Wallet as WalletIcon, TrendingUp, TrendingDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function WalletPage() {
  const authed = await getCurrentUser()
  if (!authed) return null
  const settings = await getSettings()

  const [wallet, transactions] = await Promise.all([
    db.wallet.findUnique({ where: { userId: authed.id }, select: { balance: true } }),
    db.walletTransaction.findMany({
      where: { userId: authed.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        type: true,
        reason: true,
        reference: true,
        createdAt: true,
      },
    }),
  ])

  const balance = wallet?.balance ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Wallet</h2>
        <p className="text-sm text-muted-foreground">
          Your credit balance and full transaction history.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WalletIcon className="h-4 w-4 text-foreground" />
              <CardTitle className="text-base">Current balance</CardTitle>
            </div>
          </div>
          <CardDescription>Use credits at checkout to lower the amount payable.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold tabular-nums">{formatCurrency(balance, settings.currencySymbol)}</div>
          <p className="mt-2 text-xs text-muted-foreground">
            Wallet credit is non-refundable and cannot be transferred to another account.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transaction history</CardTitle>
          <CardDescription>{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}.</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No transactions yet. Earn credits by referring friends.
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {t.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        {t.type === 'CREDIT' ? (
                          <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700">
                            <TrendingUp className="h-3 w-3" /> Credit
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 bg-rose-100 text-rose-700">
                            <TrendingDown className="h-3 w-3" /> Debit
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${t.type === 'CREDIT' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {t.type === 'CREDIT' ? '+ ' : '- '}{formatCurrency(t.amount, settings.currencySymbol)}
                      </TableCell>
                      <TableCell className="text-xs">{t.reason}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{t.reference || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
