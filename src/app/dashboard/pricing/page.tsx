// MY CS MTP — Student pricing page. Reuses the public BuyingWidget.
import { db } from '@/lib/db'
import { BuyingWidget, type BuyingPlan } from '@/components/public/buying-widget'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Tags } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const courses = await db.course.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      plans: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          planSubjects: {
            where: { isActive: true },
            include: { subject: true },
          },
        },
      },
    },
  })

  const buyingPlans: BuyingPlan[] = []
  for (const c of courses) {
    for (const p of c.plans) {
      if (p.planSubjects.length === 0) continue
      buyingPlans.push({
        planId: p.id,
        planName: p.name,
        planSlug: p.slug,
        courseName: c.name,
        courseSlug: c.slug,
        subjects: p.planSubjects.map((ps) => ({
          planSubjectId: ps.id,
          subjectId: ps.subjectId,
          subjectName: ps.subject.name,
          originalPrice: ps.originalPrice,
          offerPrice: ps.offerPrice,
        })),
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Tags className="h-5 w-5" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Pricing</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a plan, choose the subjects you need, and check out securely. Items are added to your cart.
        </p>
      </div>

      {buyingPlans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No plans are available right now. Please check back soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buyingPlans.map((p) => (
            <BuyingWidget key={p.planId} plan={p} />
          ))}
        </div>
      )}
    </div>
  )
}
