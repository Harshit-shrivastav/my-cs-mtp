// MY CS MTP — Student dashboard home.
// Greeting, exam countdown, wallet card, referral link + stats, notifications,
// free content toggle, recent purchases (last 5), recent evaluations (last 5).
import Link from 'next/link'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getCurrentUser } from '@/lib/server-auth'
import { makeReferralCode, formatCurrency } from '@/lib/utils-extra'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import CopyButtonClient from '@/components/dashboard/copy-button'
import { MarkAllNotificationsRead } from '@/components/dashboard/mark-all-notifications-read'
import {
  Clock,
  Wallet as WalletIcon,
  Gift,
  Users,
  Download,
  ScrollText,
  Award,
  Bell,
  CheckCircle2,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardHomePage() {
  const authed = await getCurrentUser()
  if (!authed) return null
  const settings = await getSettings()

  const user = await db.user.findUnique({
    where: { id: authed.id },
    select: { id: true, name: true, email: true, courseId: true, referralCode: true },
  })
  if (!user) return null

  // Generate referral code on first view if null
  let referralCode = user.referralCode
  if (!referralCode) {
    referralCode = makeReferralCode(user.name, user.email)
    try {
      await db.user.update({
        where: { id: user.id },
        data: { referralCode },
      })
    } catch {
      // Race-condition fallback: re-read the latest value
      const fresh = await db.user.findUnique({
        where: { id: user.id },
        select: { referralCode: true },
      })
      referralCode = fresh?.referralCode || referralCode
    }
  }

  const base = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const referralLink = `${base}/signup?ref=${referralCode}`

  const [examTiming, wallet, referredCount, referralCredit, freeResources, recentPurchases, recentEvaluations, notifications, unreadNotifCount, purchaseCount, userCourse] = await Promise.all([
    user.courseId
      ? db.examTiming.findUnique({ where: { courseId: user.courseId } })
      : Promise.resolve(null),
    db.wallet.findUnique({ where: { userId: user.id }, select: { balance: true } }),
    db.user.count({ where: { referredById: user.id } }),
    db.walletTransaction.aggregate({
      where: { userId: user.id, reason: 'REFERRAL', type: 'CREDIT' },
      _sum: { amount: true },
    }),
    settings.freeContentEnabled
      ? db.freeResource.findMany({
          where: { isActive: true, isPublic: true },
          orderBy: { sortOrder: 'asc' },
          take: 5,
        })
      : Promise.resolve([]),
    db.purchase.findMany({
      where: { userId: user.id, isRevoked: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        plan: { select: { name: true } },
        planSubject: {
          include: { subject: { select: { name: true } } },
        },
      },
    }),
    db.assignment.findMany({
      where: { studentId: user.id, status: 'EVALUATED', evaluatedAt: { not: null } },
      orderBy: { evaluatedAt: 'desc' },
      take: 5,
      include: {
        paper: { select: { id: true, title: true, totalMarks: true, subject: { select: { name: true } } } },
      },
    }),
    db.notificationRecipient.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        isRead: true,
        createdAt: true,
        notification: { select: { id: true, title: true, message: true, createdAt: true } },
      },
    }),
    db.notificationRecipient.count({ where: { userId: user.id, isRead: false } }),
    db.purchase.count({ where: { userId: user.id, isRevoked: false } }),
    user.courseId
      ? db.course.findUnique({ where: { id: user.courseId }, select: { name: true, slug: true } })
      : Promise.resolve(null),
  ])

  const walletBalance = wallet?.balance ?? 0
  const referralCreditAmount = referralCredit._sum.amount ?? 0

  const now = new Date()
  const daysLeft = examTiming
    ? Math.max(0, Math.ceil((examTiming.examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null

  const COURSE_PAGES: Record<string, string> = {
    cseet: '/cseet-test-series',
    'cs-executive': '/cs-executive-test-series',
    'cs-professional': '/cs-professional-test-series',
  }
  const buyHref = (userCourse && COURSE_PAGES[userCourse.slug]) || '/pricing'
  const purchasedPlanNames = Array.from(new Set(recentPurchases.map((p) => p.plan.name)))

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          {greeting()}, {user.name || user.email.split('@')[0]}!
        </h2>
        <p className="text-sm text-muted-foreground">
          Here is a snapshot of your prep progress.
        </p>
      </div>

      {/* Top purchase / access card */}
      {purchaseCount === 0 ? (
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold">You have not purchased a test series yet</h3>
              <p className="mt-1 text-sm text-primary-foreground/80">
                Buy a {userCourse ? `${userCourse.name} ` : ''}plan to unlock test papers, answer evaluation and notes for your exam prep.
              </p>
            </div>
            <Button asChild variant="secondary" className="shrink-0">
              <Link href={buyHref}>
                Buy test series <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold">Your test series is active</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {purchasedPlanNames.length > 0 ? `${purchasedPlanNames.join(', ')} — ` : ''}
                {purchaseCount} subject{purchaseCount === 1 ? '' : 's'} purchased. Open your test series to download papers and upload answers.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard/test-series">
                  Access your tests <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={buyHref}>Buy more subjects</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top row: exam countdown + wallet */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Exam countdown */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Exam countdown</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>
              {examTiming ? examTiming.examName : 'No exam date set for your course yet.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {examTiming ? (
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold tabular-nums">{daysLeft}</span>
                <span className="text-sm text-muted-foreground mb-1">days to go</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {examTiming.examDate.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Once an admin sets the exam timing for your course, a live countdown will appear here.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Wallet */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Wallet balance</CardTitle>
              <WalletIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>Use credits at checkout.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(walletBalance, settings.currencySymbol)}</div>
            {walletBalance > 0 ? (
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/dashboard/wallet">View history <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Earn credits by referring friends.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referral */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-foreground" />
              <CardTitle className="text-base">Your referral link</CardTitle>
            </div>
            <Badge variant="secondary">Earn {formatCurrency(settings.referralRewardValue, settings.currencySymbol)} per friend</Badge>
          </div>
          <CardDescription>{settings.referralRules}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={referralLink}
              className="flex-1 rounded-md border bg-muted/40 px-3 py-2 text-sm font-mono"
              aria-label="Your referral link"
            />
            <CopyButtonClient text={referralLink} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Friends joined
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{referredCount}</div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <WalletIcon className="h-3.5 w-3.5" /> Wallet credit earned
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {formatCurrency(referralCreditAmount, settings.currencySymbol)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-foreground" />
              <CardTitle className="text-base">Notifications</CardTitle>
              {unreadNotifCount > 0 && <Badge variant="default">{unreadNotifCount} unread</Badge>}
            </div>
            <MarkAllNotificationsRead unreadCount={unreadNotifCount} />
          </div>
          <CardDescription>Latest announcements from the MY CS MTP team.</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{n.notification.title}</span>
                      {!n.isRead && <Badge variant="default" className="shrink-0">New</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.notification.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                    {n.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Free content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-foreground" />
            <CardTitle className="text-base">Free resources</CardTitle>
          </div>
          <CardDescription>
            {settings.freeContentEnabled
              ? 'Quick downloads curated by our mentors. Tap to download.'
              : 'Free content is currently turned off by the admin.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!settings.freeContentEnabled ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">Free content is currently disabled.</p>
            </div>
          ) : freeResources.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">No free resources published yet. Please check back soon.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {freeResources.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    {r.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2">{r.description}</div>
                    )}
                  </div>
                  {r.fileKey && (
                    <a
                      href={`/api/download?context=free&key=${encodeURIComponent(r.fileKey)}&freeId=${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          {settings.freeContentEnabled && (
            <div className="mt-4 text-right">
              <Button asChild variant="link" size="sm" className="px-0">
                <Link href="/dashboard/free-content">See all free content <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity: purchases + evaluations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent purchases</CardTitle>
              <Link href="/dashboard/test-series" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentPurchases.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">No purchases yet.</p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/dashboard/pricing">Browse plans</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {recentPurchases.map((p) => (
                  <li key={p.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.planSubject.subject.name}</div>
                      <div className="text-xs text-muted-foreground">{p.plan.name}</div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {p.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-foreground" />
                <CardTitle className="text-base">Recent evaluations</CardTitle>
              </div>
              <Link href="/dashboard/performance" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                Performance <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentEvaluations.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">No evaluated papers yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload an answer sheet to get your first evaluation.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {recentEvaluations.map((a) => {
                  const max = a.maxMarks ?? a.paper.totalMarks ?? 100
                  const pct = a.marks != null ? Math.round((a.marks / max) * 100) : null
                  return (
                    <li key={a.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{a.paper.title}</div>
                          <div className="text-xs text-muted-foreground">{a.paper.subject.name}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold">
                          {a.marks != null ? `${a.marks}/${max}` : '—'}
                        </div>
                        {pct != null && (
                          <div className="text-xs text-muted-foreground">{pct}%</div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/dashboard/test-series" icon={ScrollText} label="Test series" hint="Download papers, upload answers" />
        <QuickLink href="/dashboard/notes" icon={ScrollText} label="Notes" hint="Course & subject notes" />
        <QuickLink href="/dashboard/mentorship" icon={ScrollText} label="Mentorship" hint="Book a 1-on-1 session" />
        <QuickLink href="/dashboard/invoice" icon={ScrollText} label="Invoice" hint="View & print your orders" />
      </div>
    </div>
  )
}

function QuickLink({ href, icon: Icon, label, hint }: { href: string; icon: LucideIcon; label: string; hint: string }) {
  return (
    <Link href={href} className="rounded-md border bg-background p-3 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Link>
  )
}
