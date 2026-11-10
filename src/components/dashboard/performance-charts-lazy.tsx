'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { TimePoint, SubjectPoint } from '@/components/dashboard/performance-charts'

// Lazy-load the charts (recharts is heavy) so the dashboard bundle stays light.
const PerformanceCharts = dynamic(() => import('@/components/dashboard/performance-charts'), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="h-[320px] rounded-md border flex items-center justify-center bg-muted/20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ))}
    </div>
  ),
})

export default function PerformanceChartsLazy({
  timeSeries,
  bySubject,
}: {
  timeSeries: TimePoint[]
  bySubject: SubjectPoint[]
}) {
  return <PerformanceCharts timeSeries={timeSeries} bySubject={bySubject} />
}
