// MY CS MTP — Examiner area navigation config (shared by the layout & mobile sheet).
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'

export interface ExaminerNavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Optional count badge key (mapped to counts passed by the layout). */
  countKey?: 'total' | 'pending' | 'evaluated'
}

// All routes are under /examiner.
export const EXAMINER_NAV: ExaminerNavItem[] = [
  { href: '/examiner', label: 'All Assignments', icon: ClipboardList, countKey: 'total' },
  { href: '/examiner/pending', label: 'Pending Assignments', icon: Clock, countKey: 'pending' },
  { href: '/examiner/evaluated', label: 'Evaluated Assignments', icon: CheckCircle2, countKey: 'evaluated' },
]

// Friendly page titles keyed by pathname (used by the top bar).
export const EXAMINER_TITLES: Record<string, string> = {
  '/examiner': 'All Assignments',
  '/examiner/pending': 'Pending Assignments',
  '/examiner/evaluated': 'Evaluated Assignments',
}
