'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CourseOpt { id: string; name: string; slug: string }

export function ScheduleFilterClient({ courses, current }: { courses: CourseOpt[]; current: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function onChange(value: string) {
    const sp = new URLSearchParams(params.toString())
    if (!value || value === 'all') sp.delete('course')
    else sp.set('course', value)
    sp.delete('page')
    const qs = sp.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // Resolve the visible label for the currently-selected value so it always
  // renders (Radix SelectValue can render blank before the dropdown is opened
  // in popper mode because the SelectItems haven't registered yet).
  const selectedLabel = (() => {
    if (!current || current === 'all') return 'All courses'
    return courses.find((c) => c.slug === current)?.name || 'All courses'
  })()

  return (
    <div className="flex items-center gap-2 max-w-md">
      <Label htmlFor="course-filter" className="whitespace-nowrap text-sm">Filter by course:</Label>
      <Select value={current || 'all'} onValueChange={onChange}>
        <SelectTrigger id="course-filter" className="flex-1">
          <SelectValue placeholder="All courses">{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All courses</SelectItem>
          {courses.map((c) => (
            <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
