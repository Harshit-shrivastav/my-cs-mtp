// MY CS MTP — Admin examiner detail: profile, paper/subject scope, evaluations.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CrudActions } from '@/components/admin/crud-actions'
import {
  AssignPaperDialog,
  AssignSubjectDialog,
  UnassignPaperButton,
  UnassignSubjectButton,
  DeleteExaminerButton,
} from '@/components/admin/examiner-detail-actions'
import {
  Mail,
  Phone,
  CalendarDays,
  BookOpen,
  FileText,
  Layers,
  Award,
  Clock,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ExaminerDetailPage({ params }: PageProps) {
  const { id } = await params

  const examiner = await db.user.findFirst({
    where: { id, role: 'EXAMINER' },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      createdAt: true,
      courseId: true,
      course: { select: { id: true, name: true } },
      examinerPapers: {
        select: {
          id: true,
          paper: {
            select: {
              id: true,
              title: true,
              course: { select: { name: true } },
              plan: { select: { name: true } },
              subject: { select: { name: true } },
            },
          },
        },
      },
      examinerSubjects: {
        select: {
          id: true,
          subject: {
            select: { id: true, name: true, course: { select: { name: true } } },
          },
        },
      },
    },
  })
  if (!examiner) notFound()

  const [evaluatedCount, pendingCount, evaluatedAssignments, papers, subjects, courses] =
    await Promise.all([
      db.assignment.count({ where: { examinerId: id, status: 'EVALUATED' } }),
      db.assignment.count({
        where: { examinerId: id, status: { in: ['ASSIGNED', 'UNDER_EVALUATION'] } },
      }),
      db.assignment.findMany({
        where: { examinerId: id, status: 'EVALUATED' },
        orderBy: { evaluatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          marks: true,
          maxMarks: true,
          submittedAt: true,
          evaluatedAt: true,
          paper: { select: { id: true, title: true, totalMarks: true } },
          student: { select: { id: true, name: true, email: true } },
        },
      }),
      db.testPaper.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          course: { select: { name: true } },
          plan: { select: { name: true } },
          subject: { select: { name: true } },
        },
      }),
      db.subject.findMany({
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, course: { select: { name: true } } },
      }),
      db.course.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    ])

  const paperOptions = papers.map((p) => ({
    id: p.id,
    title: p.title,
    courseName: p.course?.name ?? null,
    planName: p.plan?.name ?? null,
    subjectName: p.subject?.name ?? null,
  }))
  const subjectOptions = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    courseName: s.course?.name ?? null,
  }))
  const courseOptions = courses.map((c) => ({ value: c.id, label: c.name }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {examiner.name || examiner.email.split('@')[0]}
          </h2>
          <p className="text-sm text-muted-foreground">Examiner profile · ID <span className="font-mono">{examiner.id}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <CrudActions
            endpoint="/api/admin/examiners"
            fields={[
              { name: 'name', label: 'Name', type: 'text' as const, required: true },
              { name: 'mobile', label: 'Mobile', type: 'text' as const, placeholder: '10-digit mobile' },
              {
                name: 'courseId',
                label: 'Course scope (optional)',
                type: 'select' as const,
                options: courseOptions,
                selectPlaceholder: 'No specific course',
              },
            ]}
            title="Edit examiner"
            description="Update the examiner's name, mobile and course scope."
            submitLabel="Save changes"
            initial={{ id: examiner.id, name: examiner.name, mobile: examiner.mobile, courseId: examiner.courseId }}
          />
          <DeleteExaminerButton examinerId={examiner.id} name={examiner.name} email={examiner.email} />
        </div>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ProfileItem icon={Mail} label="Email" value={examiner.email} />
          <ProfileItem icon={Phone} label="Mobile" value={examiner.mobile || '—'} />
          <ProfileItem icon={BookOpen} label="Course scope" value={examiner.course?.name ?? 'All courses'} />
          <ProfileItem
            icon={CalendarDays}
            label="Joined"
            value={examiner.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          />
        </CardContent>
      </Card>

      {/* Assigned papers */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Assigned papers
              </CardTitle>
              <CardDescription>{examiner.examinerPapers.length} papers in evaluation scope.</CardDescription>
            </div>
            <AssignPaperDialog examinerId={examiner.id} papers={paperOptions} />
          </div>
        </CardHeader>
        <CardContent>
          {examiner.examinerPapers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No papers assigned yet. Use “Assign paper” to pick from the test-paper catalogue.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paper</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examiner.examinerPapers.map((ep) => (
                  <TableRow key={ep.id}>
                    <TableCell className="font-medium">{ep.paper.title}</TableCell>
                    <TableCell className="text-muted-foreground">{ep.paper.course?.name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{ep.paper.plan?.name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{ep.paper.subject?.name ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <UnassignPaperButton
                        examinerId={examiner.id}
                        paperId={ep.paper.id}
                        title={ep.paper.title}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assigned subjects */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                Assigned subjects
              </CardTitle>
              <CardDescription>{examiner.examinerSubjects.length} subjects in scope.</CardDescription>
            </div>
            <AssignSubjectDialog examinerId={examiner.id} subjects={subjectOptions} />
          </div>
        </CardHeader>
        <CardContent>
          {examiner.examinerSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subjects assigned yet. Use “Assign subject” to pick from the subject catalogue.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examiner.examinerSubjects.map((es) => (
                  <TableRow key={es.id}>
                    <TableCell className="font-medium">{es.subject.name}</TableCell>
                    <TableCell className="text-muted-foreground">{es.subject.course?.name ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <UnassignSubjectButton
                        examinerId={examiner.id}
                        subjectId={es.subject.id}
                        name={es.subject.name}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Evaluations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                Evaluations
              </CardTitle>
              <CardDescription>
                {evaluatedCount} evaluated · {pendingCount} pending
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" /> {pendingCount} pending
              </Badge>
              <Badge variant="outline">{evaluatedCount} done</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {evaluatedAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No evaluated answer sheets yet.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paper</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-right">Marks</TableHead>
                    <TableHead className="text-right">Evaluated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluatedAssignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.paper.title}</TableCell>
                      <TableCell>
                        <div className="text-sm leading-tight">{a.student.name || a.student.email.split('@')[0]}</div>
                        <div className="text-xs text-muted-foreground">{a.student.email}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {a.marks != null ? `${a.marks}/${a.maxMarks ?? a.paper.totalMarks}` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {a.evaluatedAt
                          ? a.evaluatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/examiners">← Back to examiners</Link>
        </Button>
      </div>
    </div>
  )
}

function ProfileItem({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  )
}
