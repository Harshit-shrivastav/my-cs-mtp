// MY CS MTP — Examiner area shared helpers and presentational components
// for rendering assignment rows + status badges.
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Clock,
  CheckCircle2,
  Loader2,
  Award,
  FileText,
  ChevronRight,
} from 'lucide-react'
import type { AssignmentStatus } from '@prisma/client'

export interface ExaminerAssignmentRow {
  id: string
  status: AssignmentStatus
  submittedAt: Date
  marks: number | null
  maxMarks: number | null
  student: { id: string; name: string | null; email: string }
  paper: { id: string; title: string; totalMarks: number }
  subject: { id: string; name: string }
  course: { id: string; name: string }
}

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  const map: Record<AssignmentStatus, { label: string; className: string; icon: typeof Clock }> = {
    SUBMITTED: { label: 'Submitted', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
    ASSIGNED: { label: 'Assigned', className: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
    UNDER_EVALUATION: { label: 'Under evaluation', className: 'bg-amber-100 text-amber-800 border-amber-200', icon: Loader2 },
    EVALUATED: { label: 'Evaluated', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Award },
  }
  const { label, className, icon: Icon } = map[status]
  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

interface AssignmentsTableProps {
  rows: ExaminerAssignmentRow[]
  emptyMessage?: string
  emptyHint?: string
}

export function AssignmentsTable({ rows, emptyMessage = 'No assignments found.', emptyHint }: AssignmentsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <div className="mx-auto mb-3 w-fit rounded-full bg-muted p-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">{emptyMessage}</h3>
        {emptyHint && <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{emptyHint}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Paper</TableHead>
            <TableHead className="hidden md:table-cell">Subject</TableHead>
            <TableHead className="hidden lg:table-cell">Course</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="font-medium leading-tight">
                  {row.student.name || row.student.email.split('@')[0]}
                </div>
                <div className="text-xs text-muted-foreground truncate max-w-[12rem]">{row.student.email}</div>
              </TableCell>
              <TableCell>
                <div className="font-medium leading-tight">{row.paper.title}</div>
                <div className="text-xs text-muted-foreground">{row.paper.totalMarks} marks</div>
              </TableCell>
              <TableCell className="hidden md:table-cell">{row.subject.name}</TableCell>
              <TableCell className="hidden lg:table-cell">{row.course.name}</TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {row.submittedAt.toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <StatusBadge status={row.status} />
                  {row.status === 'EVALUATED' && row.marks != null && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {row.marks}/{row.maxMarks ?? row.paper.totalMarks}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="outline" className="gap-1">
                  <Link href={`/examiner/evaluate/${row.id}`}>
                    {row.status === 'EVALUATED' ? 'View' : 'Evaluate'}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface StatCardsProps {
  total: number
  pending: number
  evaluated: number
}

export function StatCards({ total, pending, evaluated }: StatCardsProps) {
  const cards = [
    { label: 'Total', value: total, icon: FileText, tone: 'bg-muted text-foreground' },
    { label: 'Pending', value: pending, icon: Clock, tone: 'bg-amber-50 text-amber-900 border-amber-200' },
    { label: 'Evaluated', value: evaluated, icon: Award, tone: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
  ]
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <div
            key={c.label}
            className={`flex items-center gap-3 rounded-xl border p-4 ${c.tone}`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/70">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <div className="text-2xl font-semibold tabular-nums leading-none">{c.value}</div>
              <div className="mt-1 text-xs uppercase tracking-wide opacity-80">{c.label}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
