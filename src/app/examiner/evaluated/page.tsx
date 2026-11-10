// MY CS MTP — Examiner "Evaluated Assignments" page — filtered to EVALUATED.
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

export default async function EvaluatedAssignmentsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'EXAMINER') return null

  const sp = await searchParams
  const courseId = sp.courseId || undefined
  const subjectId = sp.subjectId || undefined

  const [counts, filterOptions, rows] = await Promise.all([
    fetchExaminerCounts(user.id),
    fetchExaminerFilterOptions(user.id, courseId),
    fetchExaminerAssignments(user.id, {
      filter: { kind: 'status', status: 'EVALUATED' },
      courseId,
      subjectId,
    }),
  ])

  return (
    <ExaminerListPage
      title="Evaluated Assignments"
      description="Answer sheets you've already evaluated. Open any row to view marks, remarks or re-evaluate."
      counts={counts}
      filterOptions={filterOptions}
      rows={rows}
      emptyMessage="You haven't evaluated any assignments yet."
      emptyHint="Pick a pending assignment, grade it, upload the checked copy, and it'll show up here."
    />
  )
}
