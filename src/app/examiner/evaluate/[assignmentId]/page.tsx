// MY CS MTP — Examiner evaluate page for a single assignment.
// Server: pulls the assignment + student + paper + subject + course, verifies
// the examiner's scope, then renders the client-side evaluate form.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/server-auth'
import { db } from '@/lib/db'
import { getExaminerScope, examinerCanEvaluate } from '@/lib/examiner'
import EvaluateForm from '@/components/examiner/evaluate-form'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ assignmentId: string }>
}

export default async function EvaluateAssignmentPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'EXAMINER') return null

  const { assignmentId } = await params
  if (!assignmentId) notFound()

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      status: true,
      marks: true,
      maxMarks: true,
      remarks: true,
      uploadedFileKey: true,
      fileName: true,
      evaluatedFileKey: true,
      evaluatedFileName: true,
      submittedAt: true,
      student: { select: { id: true, name: true, email: true } },
      paper: {
        select: {
          id: true,
          title: true,
          totalMarks: true,
          subjectId: true,
          subject: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!assignment) notFound()

  // Verify examiner scope
  const scope = await getExaminerScope(user.id)
  if (!examinerCanEvaluate(scope, assignment.paper.id, assignment.paper.subjectId)) {
    return (
      <div className="space-y-5">
        <div>
          <Link
            href="/examiner"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to assignments
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">This assignment is not in your scope.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You can only evaluate papers or subjects the admin has assigned to you. Please pick another
            assignment from the list.
          </p>
        </div>
      </div>
    )
  }

  const studentAnswerSheetHref = assignment.uploadedFileKey
    ? `/api/download?context=assignment&assignmentId=${assignment.id}&key=${encodeURIComponent(assignment.uploadedFileKey)}`
    : '#'

  const evaluatedDownloadHref =
    assignment.status === 'EVALUATED' && assignment.evaluatedFileKey
      ? `/api/download?context=evaluated&assignmentId=${assignment.id}&key=${encodeURIComponent(assignment.evaluatedFileKey)}`
      : null

  return (
    <EvaluateForm
      assignmentId={assignment.id}
      maxMarks={assignment.paper.totalMarks}
      initialMarks={assignment.marks}
      initialRemarks={assignment.remarks || ''}
      initialEvaluatedFileName={assignment.evaluatedFileName}
      initialEvaluatedFileKey={assignment.evaluatedFileKey}
      evaluatedDownloadHref={evaluatedDownloadHref}
      studentAnswerSheetHref={studentAnswerSheetHref}
      isAlreadyEvaluated={assignment.status === 'EVALUATED'}
      student={{ name: assignment.student.name, email: assignment.student.email }}
      paper={{ title: assignment.paper.title, totalMarks: assignment.paper.totalMarks }}
      subject={{ name: assignment.paper.subject.name }}
      course={{ name: assignment.paper.course.name }}
      submittedAt={assignment.submittedAt.toISOString()}
      status={assignment.status}
    />
  )
}
