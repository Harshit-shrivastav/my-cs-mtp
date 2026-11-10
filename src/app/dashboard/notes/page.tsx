// MY CS MTP — Student notes page.
import Link from 'next/link'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/server-auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, ShoppingCart } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NotesPage() {
  const authed = await getCurrentUser()
  if (!authed) return null

  // Purchased plan ids + subject ids (non-revoked)
  const purchases = await db.purchase.findMany({
    where: { userId: authed.id, isRevoked: false },
    select: { planId: true, subjectId: true },
  })
  const planIds = Array.from(new Set(purchases.map((p) => p.planId)))
  const subjectIds = Array.from(new Set(purchases.map((p) => p.subjectId)))

  // Notes: course matches my course AND (subject/plan matches a purchase OR no plan/subject attached)
  if (!authed.courseId) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Please select a course in your profile to see notes.
          </CardContent>
        </Card>
      </div>
    )
  }

  const notes = await db.note.findMany({
    where: {
      isActive: true,
      courseId: authed.courseId,
      OR: [
        { planId: { in: planIds } },
        { subjectId: { in: subjectIds } },
        // Course-level notes (no plan/subject) — visible only if user has any purchase
        { AND: [{ planId: null }, { subjectId: null }] },
      ],
    },
    orderBy: [{ subjectId: 'asc' }, { createdAt: 'desc' }],
    include: {
      subject: { select: { name: true } },
      plan: { select: { name: true } },
    },
  })

  return (
    <div className="space-y-6">
      <Header />

      {purchases.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No notes available yet.</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              Notes are unlocked when you purchase a subject. Pick a plan to see your course&apos;s notes here.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/pricing">Browse plans</Link>
            </Button>
          </CardContent>
        </Card>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No notes published for your subjects yet. Check back soon.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {notes.map((n) => (
            <Card key={n.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{n.title}</CardTitle>
                    <CardDescription className="mt-0.5">
                      {n.subject ? `Subject: ${n.subject.name}` : n.plan ? `Plan: ${n.plan.name}` : 'Course-wide'}
                    </CardDescription>
                  </div>
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {n.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{n.description}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px]">PDF</Badge>
                  <DownloadLink
                    href={n.fileKey ? `/api/download?context=note&noteId=${n.id}&key=${encodeURIComponent(n.fileKey)}` : null}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Header() {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Notes</h2>
      <p className="text-sm text-muted-foreground">
        Subject-wise notes and revision material included with your purchases.
      </p>
    </div>
  )
}

function DownloadLink({ href }: { href: string | null }) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-muted-foreground opacity-60">
        <Download className="h-3.5 w-3.5" /> No file
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
    >
      <Download className="h-3.5 w-3.5" /> Download
    </a>
  )
}
