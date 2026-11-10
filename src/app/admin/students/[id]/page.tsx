// MY CS MTP — Admin: student detail page.
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
import { ChangePasswordForm } from '@/components/admin/change-password-form'
import {
  StudentPurchases,
  StudentProfileActions,
} from '@/components/admin/student-purchases'
import { StudentsTableActions } from '@/components/admin/students-actions'
import { formatCurrency } from '@/lib/utils-extra'
import {
  Mail,
  Phone,
  CalendarDays,
  Wallet as WalletIcon,
  ShoppingCart,
  CheckCircle2,
  Award,
  KeyRound,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      mobile: true,
      role: true,
      isBlocked: true,
      emailVerified: true,
      referralCode: true,
      createdAt: true,
      course: { select: { id: true, name: true } },
    },
  })
  if (!user || user.role !== 'STUDENT') notFound()

  const [cartItems, purchases, wallet, assignments, orders] = await Promise.all([
    db.cartItem.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        priceSnapshot: true,
        originalPriceSnapshot: true,
        plan: { select: { id: true, name: true } },
        planSubject: { select: { subject: { select: { id: true, name: true } } } },
        createdAt: true,
      },
    }),
    db.purchase.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        isRevoked: true,
        revokedAt: true,
        price: true,
        createdAt: true,
        plan: { select: { id: true, name: true } },
        planSubject: { select: { subject: { select: { id: true, name: true } } } },
      },
    }),
    db.wallet.findUnique({
      where: { userId: id },
      select: { id: true, balance: true, transactions: { orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, amount: true, type: true, reason: true, createdAt: true } } },
    }),
    db.assignment.findMany({
      where: { studentId: id },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        status: true,
        marks: true,
        maxMarks: true,
        submittedAt: true,
        evaluatedAt: true,
        paper: { select: { id: true, title: true, totalMarks: true } },
        examiner: { select: { id: true, name: true, email: true } },
      },
    }),
    db.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, total: true, status: true, gateway: true, createdAt: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{user.name || user.email.split('@')[0]}</h2>
        <p className="text-sm text-muted-foreground">Student profile · ID <span className="font-mono">{user.id}</span></p>
      </div>

      <StudentProfileActions studentId={user.id} />

      {/* Profile card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <ProfileItem icon={Mail} label="Email" value={user.email} />
          <ProfileItem icon={Phone} label="Mobile" value={user.mobile || '—'} />
          <ProfileItem icon={CalendarDays} label="Joined" value={user.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
          <ProfileItem icon={CheckCircle2} label="Email verified" value={user.emailVerified ? `Yes (${user.emailVerified.toLocaleDateString('en-IN')})` : 'No'} />
          <ProfileItem icon={CheckCircle2} label="Course" value={user.course?.name ?? '—'} />
          <ProfileItem icon={CheckCircle2} label="Referral code" value={user.referralCode || '—'} />
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Status</span>
            {user.isBlocked ? <Badge variant="destructive">Blocked</Badge> : <Badge variant="outline">Active</Badge>}
          </div>
          <div className="flex items-center gap-2 self-end">
            <StudentsTableActions user={{ id: user.id, isBlocked: user.isBlocked, name: user.name, email: user.email }} />
          </div>
        </CardContent>
      </Card>

      {/* Wallet */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wallet ? (
            <>
              <div className="text-2xl font-semibold tabular-nums mb-3">{formatCurrency(wallet.balance)}</div>
              <CardDescription>Recent transactions</CardDescription>
              {wallet.transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">No transactions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wallet.transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs text-muted-foreground">{t.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                        <TableCell>
                          <Badge variant={t.type === 'CREDIT' ? 'default' : 'secondary'}>{t.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {t.type === 'CREDIT' ? '+' : '−'}{formatCurrency(t.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{t.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No wallet initialised.</p>
          )}
        </CardContent>
      </Card>

      {/* Purchases */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            Purchases
          </CardTitle>
          <CardDescription>{purchases.length} total · {purchases.filter((p) => !p.isRevoked).length} active</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentPurchases studentId={user.id} purchases={purchases.map((p) => ({ id: p.id, isRevoked: p.isRevoked, planId: p.plan.id, plan: { id: p.plan.id, name: p.plan.name }, subject: { id: p.planSubject.subject.id, name: p.planSubject.subject.name }, price: p.price, createdAt: p.createdAt.toISOString() }))} />
        </CardContent>
      </Card>

      {/* Cart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cart items</CardTitle>
          <CardDescription>{cartItems.length} items in cart</CardDescription>
        </CardHeader>
        <CardContent>
          {cartItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cart is empty.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartItems.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.plan.name}</TableCell>
                    <TableCell>{c.planSubject.subject.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(c.priceSnapshot)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assignments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            Assignments
          </CardTitle>
          <CardDescription>{assignments.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments submitted.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paper</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead>Examiner</TableHead>
                  <TableHead className="text-right">Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.paper.title}</TableCell>
                    <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.status === 'EVALUATED' && a.marks != null ? `${a.marks}/${a.maxMarks ?? a.paper.totalMarks}` : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{a.examiner?.name || a.examiner?.email || '—'}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{a.submittedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent orders</CardTitle>
          <CardDescription>{orders.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(o.total)}</TableCell>
                    <TableCell><Badge variant="outline">{o.gateway}</Badge></TableCell>
                    <TableCell><Badge variant={o.status === 'PAID' ? 'default' : 'secondary'}>{o.status}</Badge></TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{o.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Change student password
          </CardTitle>
          <CardDescription>Sets a new password for this student. They can use the new password on their next login.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm studentId={user.id} />
        </CardContent>
      </Card>

      <div>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/students">← Back to students</Link>
        </Button>
      </div>
    </div>
  )
}

function ProfileItem({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  )
}
