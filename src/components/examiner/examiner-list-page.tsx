// MY CS MTP — Examiner assignment list page (shared server component used by
// /examiner, /examiner/pending and /examiner/evaluated). The component takes
// the already-fetched counts + filter options + rows and renders the page.
import {
  AssignmentsTable,
  PageHeader,
  StatCards,
  type ExaminerAssignmentRow,
} from '@/components/examiner/assignments-list'
import { AssignmentFilters } from '@/components/examiner/assignment-filters'
import type { ExaminerCounts, FilterOptions } from '@/lib/examiner-list'

interface Props {
  title: string
  description: string
  counts: ExaminerCounts
  filterOptions: FilterOptions
  rows: ExaminerAssignmentRow[]
  emptyMessage?: string
  emptyHint?: string
}

export function ExaminerListPage({
  title,
  description,
  counts,
  filterOptions,
  rows,
  emptyMessage,
  emptyHint,
}: Props) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} />
      <StatCards total={counts.total} pending={counts.pending} evaluated={counts.evaluated} />

      <div className="rounded-xl border bg-card p-4">
        <AssignmentFilters courses={filterOptions.courses} subjects={filterOptions.subjects} />
      </div>

      <AssignmentsTable
        rows={rows}
        emptyMessage={emptyMessage}
        emptyHint={emptyHint}
      />
    </div>
  )
}
