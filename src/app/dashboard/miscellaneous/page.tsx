// MY CS MTP — Student miscellaneous files (amendments / circulars).
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
import { Download, Files, ShoppingCart } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MiscellaneousPage() {
  const authed = await getCurrentUser()
  if (!authed) return null

  const purchases = await db.purchase.findMany({
    where: { userId: authed.id, isRevoked: false },
    select: { planId: true, subjectId: true },
  })
  const planIds = Array.from(new Set(purchases.map((p) => p.planId)))
  const subjectIds = Array.from(new Set(purchases.map((p) => p.subjectId)))

  if (!authed.courseId) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Please select a course in your profile to see amendments.
          </CardContent>
        </Card>
      </div>
    )
  }

  const miscFiles = await db.miscFile.findMany({
    where: {
      isActive: true,
      courseId: authed.courseId,
      OR: [
        { planId: { in: planIds } },
        { subjectId: { in: subjectIds } },
        { AND: [{ planId: null }, { subjectId: null }] },
      ],
    },
    orderBy: [{ createdAt: 'desc' }],
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
            <h3 className="text-lg font-semibold">No amendments yet.</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              Amendments and other miscellaneous files are unlocked when you purchase a subject.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/pricing">Browse plans</Link>
            </Button>
          </CardContent>
        </Card>
      ) : miscFiles.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No amendments published yet. We&apos;ll let you know when something is added.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {miscFiles.map((m) => (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{m.title}</CardTitle>
                    <CardDescription className="mt-0.5">
                      {m.subject ? `Subject: ${m.subject.name}` : m.plan ? `Plan: ${m.plan.name}` : 'Course-wide'}
                    </CardDescription>
                  </div>
                  <Files className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {m.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{m.description}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {new Date(m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Badge>
                  <DownloadLink
                    href={m.fileKey ? `/api/download?context=misc&miscId=${m.id}&key=${encodeURIComponent(m.fileKey)}` : null}
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
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Miscellaneous</h2>
      <p className="text-sm text-muted-foreground">
        Amendments, circulars and other important updates for your course.
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
