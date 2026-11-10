// MY CS MTP — Examiner "Pending Assignments" page — filtered to SUBMITTED,
// ASSIGNED and UNDER_EVALUATION.
import { getCurrentUser } from '@/lib/server-auth'
import {
  fetchExaminerCounts,
  fetchExaminerAssignments,
  fetchExaminerFilterOptions,
} from '@/lib/examiner-list'
import { ExaminerListPage } from '@/components/examiner/examiner-list-page'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ courseId?: string; subjectId?: string }>
}

export default async function PendingAssignmentsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'EXAMINER') return null

  const sp = await searchParams
  const courseId = sp.courseId || undefined
  const subjectId = sp.subjectId || undefined

  const [counts, filterOptions, rows] = await Promise.all([
    fetchExaminerCounts(user.id),
    fetchExaminerFilterOptions(user.id, courseId),
    fetchExaminerAssignments(user.id, {
      filter: { kind: 'status', status: 'PENDING' },
      courseId,
      subjectId,
    }),
  ])

  return (
    <ExaminerListPage
      title="Pending Assignments"
      description="Answer sheets awaiting your evaluation — submitted, assigned, or already under evaluation."
      counts={counts}
      filterOptions={filterOptions}
      rows={rows}
      emptyMessage="Nothing pending right now."
      emptyHint="When new answer sheets arrive, they'll show up here so you can start evaluating."
    />
  )
}
