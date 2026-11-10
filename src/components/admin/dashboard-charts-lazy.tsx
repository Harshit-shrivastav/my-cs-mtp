'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { MonthPoint, StatusSlice } from '@/components/admin/dashboard-charts-types'

const Charts = dynamic(() => import('@/components/admin/dashboard-charts').then((m) => m.AdminDashboardCharts), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-[280px] rounded-md border flex items-center justify-center bg-muted/20 ${i === 2 ? 'lg:col-span-2' : ''}`}
        >
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ))}
    </div>
  ),
})

export default function AdminDashboardChartsLazy({
  monthSeries,
  statusSlices,
}: {
  monthSeries: MonthPoint[]
  statusSlices: StatusSlice[]
}) {
  return <Charts monthSeries={monthSeries} statusSlices={statusSlices} />
}
