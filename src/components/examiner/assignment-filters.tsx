'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

export interface FilterOption {
  id: string
  label: string
}

interface AssignmentFiltersProps {
  courses: FilterOption[]
  subjects: FilterOption[]
  /** Subjects to render — should already be filtered by selected course in the page. */
}

/** "All" sentinel value — empty string means "no filter". */
const ALL = '__all__'

export function AssignmentFilters({ courses, subjects }: AssignmentFiltersProps) {
  const router = useRouter()
  const pathname = usePathname() || '/examiner'
  const sp = useSearchParams()
  const [pending, startTransition] = useTransition()

  const courseId = sp.get('courseId') || ''
  const subjectId = sp.get('subjectId') || ''

  function apply(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(next)) {
      if (!v) params.delete(k)
      else params.set(k, v)
    }
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Course</label>
        <Select
          value={courseId || ALL}
          onValueChange={(v) => apply({ courseId: v === ALL ? undefined : v, subjectId: undefined })}
        >
          <SelectTrigger className="w-full sm:w-56" disabled={pending}>
            <SelectValue placeholder="All courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Subject</label>
        <Select
          value={subjectId || ALL}
          onValueChange={(v) => apply({ subjectId: v === ALL ? undefined : v })}
        >
          <SelectTrigger className="w-full sm:w-56" disabled={pending}>
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {pending && (
        <span className="mt-6 inline-flex items-center gap-1 text-xs text-muted-foreground sm:mt-0 sm:self-end sm:pb-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…
        </span>
      )}
    </div>
  )
}
