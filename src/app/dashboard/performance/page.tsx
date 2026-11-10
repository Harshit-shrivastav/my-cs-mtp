// MY CS MTP — Student performance page: marks per paper/subject, charts, table.
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/server-auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import PerformanceChartsLazy from '@/components/dashboard/performance-charts-lazy'
import type { TimePoint, SubjectPoint } from '@/components/dashboard/performance-charts'
import { Award, LineChart as LineChartIcon, Table2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
  const authed = await getCurrentUser()
  if (!authed) return null

  // All evaluated assignments for this user
  const assignments = await db.assignment.findMany({
    where: { studentId: authed.id, status: 'EVALUATED', evaluatedAt: { not: null } },
    orderBy: { evaluatedAt: 'asc' },
    include: {
      paper: {
        select: {
          id: true,
          title: true,
          totalMarks: true,
          subject: { select: { id: true, name: true } },
        },
      },
    },
  })

  // Time-series (line chart): one point per evaluated assignment
  const timeSeries: TimePoint[] = assignments.map((a) => {
    const max = a.maxMarks ?? a.paper.totalMarks ?? 100
    const marks = a.marks ?? 0
    const pct = Math.round((marks / max) * 100)
    const evaluatedAt = a.evaluatedAt!
    return {
      date: evaluatedAt.toISOString(),
      label: evaluatedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      marks,
      pct,
    }
  })

  // Aggregate per subject (bar chart): avg pct + count
  const subjectMap = new Map<string, { sum: number; count: number; subjectName: string }>()
  for (const a of assignments) {
    const max = a.maxMarks ?? a.paper.totalMarks ?? 100
    const marks = a.marks ?? 0
    const pct = (marks / max) * 100
    const key = a.paper.subject.id
    if (!subjectMap.has(key)) {
      subjectMap.set(key, { sum: 0, count: 0, subjectName: a.paper.subject.name })
    }
    const s = subjectMap.get(key)!
    s.sum += pct
    s.count += 1
  }
  const bySubject: SubjectPoint[] = Array.from(subjectMap.entries()).map(([_, s]) => ({
    subject: s.subjectName,
    avgPct: Math.round(s.sum / s.count),
    count: s.count,
  }))

  // Reverse the table for display (most recent first)
  const tableRows = [...assignments].reverse()

  // Summary stats
  const evaluatedCount = assignments.length
  const avgPct = evaluatedCount > 0
    ? Math.round(timeSeries.reduce((sum, p) => sum + p.pct, 0) / evaluatedCount)
    : 0
  const bestPct = evaluatedCount > 0 ? Math.max(...timeSeries.map((p) => p.pct)) : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Performance</h2>
        <p className="text-sm text-muted-foreground">
          Your marks across all evaluated papers. Charts update automatically after each evaluation.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Papers evaluated" value={String(evaluatedCount)} icon={Table2} />
        <StatCard label="Average score" value={`${avgPct}%`} icon={LineChartIcon} />
        <StatCard label="Best score" value={`${bestPct}%`} icon={Award} />
      </div>

      {evaluatedCount === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <LineChartIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No evaluated papers yet.</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              Once your examiner evaluates an answer sheet, your performance charts and history will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Charts */}
          <PerformanceChartsLazy timeSeries={timeSeries} bySubject={bySubject} />

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Evaluated papers</CardTitle>
              <CardDescription>Most recent first.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paper</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Marks</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Evaluated on</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((a) => {
                      const max = a.maxMarks ?? a.paper.totalMarks ?? 100
                      const marks = a.marks ?? 0
                      const pct = Math.round((marks / max) * 100)
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.paper.title}</TableCell>
                          <TableCell className="text-muted-foreground">{a.paper.subject.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{marks}/{max}</TableCell>
                          <TableCell className={`text-right tabular-nums font-medium ${pctColor(pct)}`}>{pct}%</TableCell>
                          <TableCell className="text-right text-muted-foreground text-xs">
                            {a.evaluatedAt?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Award }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

function pctColor(pct: number): string {
  if (pct >= 75) return 'text-emerald-600'
  if (pct >= 50) return 'text-foreground'
  return 'text-amber-600'
}
