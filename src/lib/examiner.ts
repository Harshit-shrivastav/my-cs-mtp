// MY CS MTP — Examiner scope helpers.
// Computes the set of papers/subjects an examiner is allowed to evaluate
// and builds the matching Prisma `where` clauses.
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import type { AssignmentStatus } from '@prisma/client'

export interface ExaminerScope {
  /** When true, the examiner has no specific papers or subjects assigned
   *  and falls back to the "global" view (all SUBMITTED/UNDER_EVALUATION
   *  plus anything they themselves have already evaluated). */
  isGlobal: boolean
  paperIds: string[]
  subjectIds: string[]
}

export async function getExaminerScope(userId: string): Promise<ExaminerScope> {
  const [paperLinks, subjectLinks] = await Promise.all([
    db.examinerPaper.findMany({
      where: { examinerId: userId },
      select: { paperId: true },
    }),
    db.examinerSubject.findMany({
      where: { examinerId: userId },
      select: { subjectId: true },
    }),
  ])
  const paperIds = paperLinks.map((p) => p.paperId)
  const subjectIds = subjectLinks.map((s) => s.subjectId)
  const isGlobal = paperIds.length === 0 && subjectIds.length === 0
  return { isGlobal, paperIds, subjectIds }
}

const PENDING_STATUSES: AssignmentStatus[] = ['SUBMITTED', 'ASSIGNED', 'UNDER_EVALUATION']

/** Pending statuses used by the fallback / global view. Spec literally lists
 *  SUBMITTED + UNDER_EVALUATION for the fallback. ASSIGNED is intentionally
 *  excluded because a global examiner doesn't take over assignments already
 *  routed to a specific examiner. */
const FALLBACK_PENDING_STATUSES: AssignmentStatus[] = ['SUBMITTED', 'UNDER_EVALUATION']

export type ExaminerListFilter =
  | { kind: 'all' }
  | { kind: 'status'; status: 'PENDING' | 'EVALUATED' }
  | { kind: 'single'; status: AssignmentStatus }

interface FilterInput {
  filter: ExaminerListFilter
  courseId?: string
  subjectId?: string
}

/**
 * Builds the Prisma `where` clause for the assignments visible to this examiner.
 *
 * - If the examiner has explicit paper/subject links → only those papers/subjects.
 *   For an "all" or "PENDING" filter we apply the relevant status subset.
 * - If the examiner has no links (global) → only SUBMITTED + UNDER_EVALUATION rows
 *   (for the all/pending views), OR already EVALUATED-by-me rows (for the evaluated
 *   view), OR the union of both (for the all view).
 */
export function examinerAssignmentWhere(
  userId: string,
  scope: ExaminerScope,
  input: FilterInput
): Prisma.AssignmentWhereInput {
  const { filter, courseId, subjectId } = input
  const where: Prisma.AssignmentWhereInput = {}

  // Scope OR clause — what's visible to this examiner at all
  const scopeOr: Prisma.AssignmentWhereInput[] = []
  if (!scope.isGlobal) {
    if (scope.paperIds.length > 0) {
      scopeOr.push({ paperId: { in: scope.paperIds } })
    }
    if (scope.subjectIds.length > 0) {
      scopeOr.push({ paper: { subjectId: { in: scope.subjectIds } } })
    }
  } else {
    // Global fallback — visible set = (SUBMITTED | UNDER_EVALUATION) | (evaluated by me)
    scopeOr.push({ status: { in: FALLBACK_PENDING_STATUSES } })
    scopeOr.push({ examinerId: userId, status: 'EVALUATED' })
  }
  if (scopeOr.length === 1) {
    Object.assign(where, scopeOr[0])
  } else if (scopeOr.length > 1) {
    where.OR = scopeOr
  }

  // Apply the list filter on top of the scope
  if (filter.kind === 'status' && filter.status === 'PENDING') {
    where.status = { in: PENDING_STATUSES }
  } else if (filter.kind === 'status' && filter.status === 'EVALUATED') {
    where.status = 'EVALUATED'
    // Global examiner: only evaluated-by-me rows; explicit-scope examiner: any
    // evaluated row in their scope.
    if (scope.isGlobal) {
      where.examinerId = userId
    }
  } else if (filter.kind === 'single') {
    where.status = filter.status
  }
  // filter.kind === 'all' → no extra status filter

  if (courseId) {
    where.paper = {
      ...(typeof where.paper === 'object' && where.paper !== null ? where.paper : {}),
      courseId,
    }
  }
  if (subjectId) {
    where.paper = {
      ...(typeof where.paper === 'object' && where.paper !== null ? where.paper : {}),
      subjectId,
    }
  }

  return where
}

/** Returns the pending statuses used by the global fallback. */
export function fallbackPendingStatuses(): AssignmentStatus[] {
  return FALLBACK_PENDING_STATUSES
}

/** Returns the standard pending statuses (SUBMITTED, ASSIGNED, UNDER_EVALUATION). */
export function pendingStatuses(): AssignmentStatus[] {
  return PENDING_STATUSES
}

/**
 * Verifies that the given examiner is allowed to evaluate the given assignment.
 * True if:
 *   - The examiner has an explicit paper-link to assignment.paperId, OR
 *   - The examiner has an explicit subject-link to assignment.paper.subjectId, OR
 *   - The examiner is global (no links at all) — fallback to "any assignment".
 */
export function examinerCanEvaluate(
  scope: ExaminerScope,
  paperId: string,
  paperSubjectId: string
): boolean {
  if (scope.isGlobal) return true
  if (scope.paperIds.includes(paperId)) return true
  if (scope.subjectIds.includes(paperSubjectId)) return true
  return false
}
