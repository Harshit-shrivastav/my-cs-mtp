// MY CS MTP — Admin plan detail (plan-subjects manager + plan info).
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlanSubjectsManager } from '@/components/admin/plans-actions'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminPlanDetailPage({ params }: PageProps) {
  const { id } = await params
  const plan = await db.plan.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      sortOrder: true,
      description: true,
      tags: true,
      scheduleFileKey: true,
      course: { select: { id: true, name: true } },
      _count: { select: { papers: true } },
    },
  })
  if (!plan) notFound()

  const [subjects, planSubjects] = await Promise.all([
    db.subject.findMany({
      where: { courseId: plan.course.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, isActive: true },
    }),
    db.planSubject.findMany({
      where: { planId: id },
      orderBy: { subject: { sortOrder: 'asc' } },
      select: {
        id: true,
        subjectId: true,
        originalPrice: true,
        offerPrice: true,
        isActive: true,
        subject: { select: { id: true, name: true } },
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Button asChild size="sm" variant="ghost" className="mb-2 gap-1 text-muted-foreground">
          <Link href="/admin/plans">
            <ArrowLeft className="h-4 w-4" />
            Back to plans
          </Link>
        </Button>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{plan.name}</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{plan.slug}</span> · {plan.course.name}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plan info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Status" value={plan.isActive ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Inactive</Badge>} />
            <Info label="Sort order" value={String(plan.sortOrder)} />
            <Info label="Papers" value={`${plan._count.papers}`} />
            <Info label="Schedule file" value={plan.scheduleFileKey ? 'Uploaded' : '—'} />
            <Info label="Tags" value={plan.tags || '—'} />
            <Info label="Description" value={plan.description || '—'} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plan subjects &amp; pricing</CardTitle>
          <CardDescription>Set the original and offer prices for each subject in this plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlanSubjectsManager
            planId={plan.id}
            courseId={plan.course.id}
            subjects={subjects}
            planSubjects={planSubjects}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  )
}
