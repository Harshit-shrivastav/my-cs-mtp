// MY CS MTP — Admin exam timing page. ADMIN-only (via admin layout).
// Rows feed the public homepage countdown + per-student dashboard countdown.
import { db } from '@/lib/db'
import { daysRemaining } from '@/lib/exam-timing-utils'
import { ExamTimingTable } from '@/components/admin/exam-timing-table'

export const dynamic = 'force-dynamic'

function formatExamDate(d: Date): string {
  return (
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  )
}

export default async function AdminExamTimingPage() {
  const [rows, courses] = await Promise.all([
    db.examTiming.findMany({
      orderBy: { examDate: 'asc' },
      include: { course: { select: { id: true, name: true } } },
    }),
    db.course.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, isActive: true },
    }),
  ])

  const serialized = rows.map((r) => ({
    id: r.id,
    examName: r.examName,
    courseKey: r.courseKey,
    courseId: r.courseId,
    courseName: r.course?.name ?? null,
    examDateIso: r.examDate.toISOString(),
    examDateLabel: formatExamDate(r.examDate),
    isVisible: r.isVisible,
    daysRemaining: daysRemaining(r.examDate),
    past: r.examDate.getTime() < Date.now(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Exam Timing</h2>
        <p className="text-sm text-muted-foreground">
          Upcoming exam dates shown as countdowns on the public homepage and on each student&apos;s
          dashboard (via the linked course). One countdown per course.
        </p>
      </div>

      <ExamTimingTable rows={serialized} courses={courses} />
    </div>
  )
}
