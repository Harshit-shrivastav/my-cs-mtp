// MY CS MTP — Examiner list of assignments (GET /api/examiner/assignments).
// Returns assignments visible to the calling examiner, filtered by
// status / courseId / subjectId query params.
import { NextResponse } from 'next/server'
import { requireRole, isAuthCtx } from '@/lib/guards'
import {
  fetchExaminerAssignments,
  fetchExaminerFilterOptions,
} from '@/lib/examiner-list'
import type { ExaminerListFilter } from '@/lib/examiner'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireRole(req, 'EXAMINER')
  if (!isAuthCtx(ctx)) return ctx
  const userId = ctx.user.id

  const u = new URL(req.url)
  const statusParam = u.searchParams.get('status') || ''
  const courseId = u.searchParams.get('courseId') || undefined
  const subjectId = u.searchParams.get('subjectId') || undefined

  let filter: ExaminerListFilter
  if (statusParam === 'PENDING') filter = { kind: 'status', status: 'PENDING' }
  else if (statusParam === 'EVALUATED') filter = { kind: 'status', status: 'EVALUATED' }
  else if (
    statusParam === 'SUBMITTED' ||
    statusParam === 'ASSIGNED' ||
    statusParam === 'UNDER_EVALUATION'
  ) {
    filter = { kind: 'single', status: statusParam }
  } else {
    filter = { kind: 'all' }
  }

  const [rows, filterOptions] = await Promise.all([
    fetchExaminerAssignments(userId, { filter, courseId, subjectId }),
    fetchExaminerFilterOptions(userId, courseId),
  ])

  return NextResponse.json({ filter, courseId: courseId || null, subjectId: subjectId || null, filterOptions, rows })
}
