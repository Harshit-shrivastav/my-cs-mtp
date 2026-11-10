// MY CS MTP — Examiner area data loaders shared by pages and API route.
import { db } from '@/lib/db'
import {
  getExaminerScope,
  examinerAssignmentWhere,
  type ExaminerListFilter,
  type ExaminerScope,
} from '@/lib/examiner'
import type { Prisma } from '@prisma/client'
import type { ExaminerAssignmentRow } from '@/components/examiner/assignments-list'

export interface ExaminerCounts {
  total: number
  pending: number
  evaluated: number
}

export async function fetchExaminerCounts(userId: string): Promise<ExaminerCounts> {
  const scope = await getExaminerScope(userId)
  const [total, pending, evaluated] = await Promise.all([
    db.assignment.count({
      where: examinerAssignmentWhere(userId, scope, { filter: { kind: 'all' } }) as Prisma.AssignmentWhereInput,
    }),
    db.assignment.count({
      where: examinerAssignmentWhere(userId, scope, { filter: { kind: 'status', status: 'PENDING' } }) as Prisma.AssignmentWhereInput,
    }),
    db.assignment.count({
      where: examinerAssignmentWhere(userId, scope, { filter: { kind: 'status', status: 'EVALUATED' } }) as Prisma.AssignmentWhereInput,
    }),
  ])
  return { total, pending, evaluated }
}

export interface AssignmentFilters {
  courseId?: string
  subjectId?: string
}

export interface ListOptions extends AssignmentFilters {
  filter: ExaminerListFilter
}

export async function fetchExaminerAssignments(
  userId: string,
  opts: ListOptions
): Promise<ExaminerAssignmentRow[]> {
  const scope = await getExaminerScope(userId)
  const where = examinerAssignmentWhere(userId, scope, {
    filter: opts.filter,
    courseId: opts.courseId,
    subjectId: opts.subjectId,
  }) as Prisma.AssignmentWhereInput

  const rows = await db.assignment.findMany({
    where,
    orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      status: true,
      submittedAt: true,
      marks: true,
      maxMarks: true,
      student: { select: { id: true, name: true, email: true } },
      paper: {
        select: {
          id: true,
          title: true,
          totalMarks: true,
          subject: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
        },
      },
    },
  })

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    submittedAt: r.submittedAt,
    marks: r.marks,
    maxMarks: r.maxMarks,
    student: { id: r.student.id, name: r.student.name, email: r.student.email },
    paper: { id: r.paper.id, title: r.paper.title, totalMarks: r.paper.totalMarks },
    subject: { id: r.paper.subject.id, name: r.paper.subject.name },
    course: { id: r.paper.course.id, name: r.paper.course.name },
  }))
}

export interface FilterOptions {
  courses: { id: string; label: string }[]
  subjects: { id: string; label: string }[]
}

/** Returns the course + subject filter dropdown options for an examiner's
 *  scope. When `selectedCourseId` is set, the subjects list is narrowed to
 *  only subjects belonging to that course (within the examiner's scope). */
export async function fetchExaminerFilterOptions(
  userId: string,
  selectedCourseId?: string
): Promise<FilterOptions> {
  const scope = await getExaminerScope(userId)
  return filterOptionsForScope(scope, selectedCourseId)
}

export async function filterOptionsForScope(
  scope: ExaminerScope,
  selectedCourseId?: string
): Promise<FilterOptions> {
  if (scope.isGlobal) {
    const courseWhere = selectedCourseId ? { id: selectedCourseId, isActive: true } : { isActive: true }
    const [courses, subjects] = await Promise.all([
      db.course.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true },
      }),
      db.subject.findMany({
        where: selectedCourseId
          ? { courseId: selectedCourseId, isActive: true }
          : { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, courseId: true, course: { select: { name: true } } },
      }),
    ])
    void courseWhere
    return {
      courses: courses.map((c) => ({ id: c.id, label: c.name })),
      subjects: subjects.map((s) => ({
        id: s.id,
        label: `${s.name}${s.course ? ' — ' + s.course.name : ''}`,
      })),
    }
  }

  // Explicit scope — pull courses/subjects from the linked papers/subjects.
  const [paperRows, subjectRows] = await Promise.all([
    scope.paperIds.length > 0
      ? db.testPaper.findMany({
          where: { id: { in: scope.paperIds } },
          select: {
            subject: {
              select: {
                id: true,
                name: true,
                courseId: true,
                course: { select: { id: true, name: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    scope.subjectIds.length > 0
      ? db.subject.findMany({
          where: { id: { in: scope.subjectIds } },
          select: { id: true, name: true, courseId: true, course: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
  ])

  const courseMap = new Map<string, string>()
  const subjectMap = new Map<string, { label: string; courseId: string }>()

  for (const p of paperRows) {
    const s = p.subject
    if (s) {
      subjectMap.set(s.id, {
        label: `${s.name}${s.course ? ' — ' + s.course.name : ''}`,
        courseId: s.course?.id || '',
      })
      if (s.course) courseMap.set(s.course.id, s.course.name)
    }
  }
  for (const s of subjectRows) {
    subjectMap.set(s.id, {
      label: `${s.name}${s.course ? ' — ' + s.course.name : ''}`,
      courseId: s.course?.id || '',
    })
    if (s.course) courseMap.set(s.course.id, s.course.name)
  }

  const subjects = selectedCourseId
    ? Array.from(subjectMap.entries())
        .filter(([, v]) => v.courseId === selectedCourseId)
        .map(([id, v]) => ({ id, label: v.label }))
    : Array.from(subjectMap.entries()).map(([id, v]) => ({ id, label: v.label }))

  return {
    courses: Array.from(courseMap.entries()).map(([id, label]) => ({ id, label })),
    subjects,
  }
}
