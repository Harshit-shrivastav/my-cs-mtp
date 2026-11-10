// MY CS MTP — Student test-series page: purchased subjects grouped by plan,
// with their papers, submission status, and upload / download actions.
import Link from 'next/link'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import UploadAssignmentForm from '@/components/dashboard/upload-assignment-form'
import {
  Download,
  FileCheck2,
  FileText,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Loader2,
  Calendar,
  Award,
  MessageSquare,
  FileDown,
} from 'lucide-react'
import type { AssignmentStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface PaperView {
  id: string
  title: string
  description: string | null
  scheduledDate: Date | null
  totalMarks: number
  allowAnswerDownload: boolean
  questionFileKey: string | null
  answerFileKey: string | null
  assignment: {
    id: string
    status: AssignmentStatus
    marks: number | null
    maxMarks: number | null
    remarks: string | null
    evaluatedFileKey: string | null
    uploadedFileKey: string | null
  } | null
}

interface SubjectGroup {
  subjectId: string
  subjectName: string
  papers: PaperView[]
}

interface PlanGroup {
  planId: string
  planName: string
  courseName: string
  subjects: SubjectGroup[]
}

export default async function TestSeriesPage() {
  const authed = await getCurrentUser()
  if (!authed) return null
  const settings = await getSettings()

  // Active purchases
  const purchases = await db.purchase.findMany({
    where: { userId: authed.id, isRevoked: false },
    orderBy: { createdAt: 'desc' },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          course: { select: { id: true, name: true } },
        },
      },
      planSubject: {
        select: {
          id: true,
          subjectId: true,
          subject: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (purchases.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">You don&apos;t have any test series yet.</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              Pick a plan, choose the subjects you need, and start writing. You&apos;ll see all your purchased papers here.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/pricing">Browse plans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Group by plan
  const planMap = new Map<string, PlanGroup>()
  for (const p of purchases) {
    const planId = p.plan.id
    if (!planMap.has(planId)) {
      planMap.set(planId, {
        planId,
        planName: p.plan.name,
        courseName: p.plan.course.name,
        subjects: [],
      })
    }
    const planGroup = planMap.get(planId)!

    // Skip if subject already in this plan group
    if (planGroup.subjects.find((s) => s.subjectId === p.planSubject.subjectId)) continue

    // Fetch papers for this planSubject
    const papers = await db.testPaper.findMany({
      where: { planSubjectId: p.planSubjectId, isActive: true },
      orderBy: [{ scheduledDate: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        scheduledDate: true,
        totalMarks: true,
        allowAnswerDownload: true,
        questionFileKey: true,
        answerFileKey: true,
      },
    })

    // Fetch this user's assignments for those papers in one shot
    const paperIds = papers.map((pp) => pp.id)
    const assignments = paperIds.length
      ? await db.assignment.findMany({
          where: { studentId: authed.id, paperId: { in: paperIds } },
          select: {
            id: true,
            paperId: true,
            status: true,
            marks: true,
            maxMarks: true,
            remarks: true,
            evaluatedFileKey: true,
            uploadedFileKey: true,
          },
        })
      : []
    const assignmentByPaper = new Map(assignments.map((a) => [a.paperId, a]))

    const paperViews: PaperView[] = papers.map((pp) => {
      const assignment = assignmentByPaper.get(pp.id) || null
      return {
        id: pp.id,
        title: pp.title,
        description: pp.description,
        scheduledDate: pp.scheduledDate,
        totalMarks: pp.totalMarks,
        allowAnswerDownload: pp.allowAnswerDownload,
        questionFileKey: pp.questionFileKey,
        answerFileKey: pp.answerFileKey,
        assignment: assignment
          ? {
              id: assignment.id,
              status: assignment.status,
              marks: assignment.marks,
              maxMarks: assignment.maxMarks,
              remarks: assignment.remarks,
              evaluatedFileKey: assignment.evaluatedFileKey,
              uploadedFileKey: assignment.uploadedFileKey,
            }
          : null,
      }
    })

    planGroup.subjects.push({
      subjectId: p.planSubject.subjectId,
      subjectName: p.planSubject.subject.name,
      papers: paperViews,
    })
  }

  const planGroups = Array.from(planMap.values())

  return (
    <div className="space-y-6">
      <Header />

      {planGroups.map((pg) => (
        <Card key={pg.planId}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-base">{pg.planName}</CardTitle>
                <CardDescription>{pg.courseName}</CardDescription>
              </div>
              <Badge variant="outline">{pg.subjects.length} subject{pg.subjects.length !== 1 ? 's' : ''}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {pg.subjects.map((sg) => (
              <div key={sg.subjectId} className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-foreground" />
                  <h4 className="text-sm font-semibold">{sg.subjectName}</h4>
                </div>
                {sg.papers.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-6">No test papers published for this subject yet.</p>
                ) : (
                  <div className="space-y-3 pl-6">
                    {sg.papers.map((paper) => (
                      <PaperRow key={paper.id} paper={paper} settings={settings} />
                    ))}
                  </div>
                )}
                <Separator />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function Header() {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Test Series</h2>
      <p className="text-sm text-muted-foreground">
        Download question papers, write by hand, and upload your answer sheet.
      </p>
    </div>
  )
}

function PaperRow({ paper, settings }: { paper: PaperView; settings: { assignmentUploadEnabled: boolean; assignmentUploadDisabledMessage: string } }) {
  const a = paper.assignment
  const evaluated = a?.status === 'EVALUATED'

  return (
    <div className="rounded-md border bg-background p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h5 className="text-sm font-medium">{paper.title}</h5>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {paper.scheduledDate
                ? paper.scheduledDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'No schedule'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Award className="h-3.5 w-3.5" /> {paper.totalMarks} marks
            </span>
            {a && <StatusBadge status={a.status} />}
          </div>
        </div>
        {evaluated && a!.marks != null && (
          <div className="text-right">
            <div className="text-sm font-semibold tabular-nums">
              {a!.marks}/{a!.maxMarks ?? paper.totalMarks}
            </div>
            <div className="text-xs text-muted-foreground">
              {Math.round((a!.marks / (a!.maxMarks ?? paper.totalMarks)) * 100)}%
            </div>
          </div>
        )}
      </div>

      {paper.description && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{paper.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Download question paper */}
        <DownloadLink
          href={paper.questionFileKey ? `/api/download?context=paper&paperId=${paper.id}&key=${encodeURIComponent(paper.questionFileKey)}` : null}
          icon={Download}
          label="Question paper"
        />
        {/* Download answer/solution */}
        {paper.allowAnswerDownload && (
          <DownloadLink
            href={paper.answerFileKey ? `/api/download?context=answer&paperId=${paper.id}&key=${encodeURIComponent(paper.answerFileKey)}` : null}
            icon={FileDown}
            label="Solution"
          />
        )}
        {/* Download own uploaded answer sheet (re-download) */}
        {a?.uploadedFileKey && (
          <DownloadLink
            href={`/api/download?context=assignment&assignmentId=${a.id}&key=${encodeURIComponent(a.uploadedFileKey)}`}
            icon={FileCheck2}
            label="My answer sheet"
          />
        )}
        {/* Download evaluated copy */}
        {evaluated && a!.evaluatedFileKey && (
          <DownloadLink
            href={`/api/download?context=evaluated&assignmentId=${a.id}&key=${encodeURIComponent(a.evaluatedFileKey)}`}
            icon={CheckCircle2}
            label="Evaluated copy"
            variant="primary"
          />
        )}
      </div>

      {/* Upload form */}
      <div className="mt-3">
        <UploadAssignmentForm
          paperId={paper.id}
          paperTitle={paper.title}
          enabled={settings.assignmentUploadEnabled}
          disabledMessage={settings.assignmentUploadDisabledMessage}
          currentStatus={a?.status ?? null}
          hasExistingFile={!!a?.uploadedFileKey}
        />
      </div>

      {/* Remarks after evaluation */}
      {evaluated && a!.remarks && (
        <div className="mt-3 rounded-md bg-muted/40 p-3 text-xs">
          <div className="flex items-center gap-1 font-medium mb-1">
            <MessageSquare className="h-3.5 w-3.5" /> Examiner remarks
          </div>
          <p className="text-muted-foreground whitespace-pre-line">{a!.remarks}</p>
        </div>
      )}
    </div>
  )
}

function DownloadLink({
  href,
  icon: Icon,
  label,
  variant = 'outline',
}: {
  href: string | null
  icon: typeof Download
  label: string
  variant?: 'outline' | 'primary'
}) {
  if (!href) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-muted-foreground opacity-60"
        title="Not available"
      >
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        variant === 'primary'
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'border hover:bg-muted'
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </a>
  )
}

function StatusBadge({ status }: { status: AssignmentStatus }) {
  const map: Record<AssignmentStatus, { label: string; color: string; icon: typeof Clock }> = {
    SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
    ASSIGNED: { label: 'Assigned to examiner', color: 'bg-amber-100 text-amber-800', icon: Clock },
    UNDER_EVALUATION: { label: 'Under evaluation', color: 'bg-amber-100 text-amber-800', icon: Loader2 },
    EVALUATED: { label: 'Evaluated', color: 'bg-emerald-100 text-emerald-800', icon: Award },
  }
  const { label, color, icon: Icon } = map[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  )
}
