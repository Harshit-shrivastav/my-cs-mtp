// MY CS MTP — Examiner "All Assignments" page.
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

export default async function AllAssignmentsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'EXAMINER') return null

  const sp = await searchParams
  const courseId = sp.courseId || undefined
  const subjectId = sp.subjectId || undefined

  const [counts, filterOptions, rows] = await Promise.all([
    fetchExaminerCounts(user.id),
    fetchExaminerFilterOptions(user.id, courseId),
    fetchExaminerAssignments(user.id, { filter: { kind: 'all' }, courseId, subjectId }),
  ])

  return (
    <ExaminerListPage
      title="All Assignments"
      description="Every assignment visible to you — pending evaluation and already evaluated."
      counts={counts}
      filterOptions={filterOptions}
      rows={rows}
      emptyMessage="No assignments in your scope yet."
      emptyHint="When students submit answer sheets for papers you examine, they'll appear here. Pick a course or subject above to filter the list."
    />
  )
}
