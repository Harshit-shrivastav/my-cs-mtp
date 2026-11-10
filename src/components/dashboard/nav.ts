// MY CS MTP — Dashboard navigation config (shared by the layout & mobile sheet).
import {
  LayoutDashboard,
  LineChart,
  FileText,
  NotebookPen,
  Files,
  CalendarClock,
  Tags,
  User as UserIcon,
  Receipt,
  Wallet as WalletIcon,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Only render this link when this predicate is true. */
  when?: (ctx: { walletBalance: number }) => boolean
}

// NOTE: The home route is just `/dashboard`, others are sub-routes.
export const DASHBOARD_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/performance', label: 'Performance', icon: LineChart },
  { href: '/dashboard/test-series', label: 'Test Series', icon: FileText },
  { href: '/dashboard/notes', label: 'Notes', icon: NotebookPen },
  { href: '/dashboard/miscellaneous', label: 'Miscellaneous', icon: Files },
  { href: '/dashboard/mentorship', label: 'Mentorship', icon: CalendarClock },
  { href: '/dashboard/pricing', label: 'Pricing', icon: Tags },
  { href: '/dashboard/profile', label: 'Profile', icon: UserIcon },
  { href: '/dashboard/invoice', label: 'Invoice', icon: Receipt },
  { href: '/dashboard/wallet', label: 'Wallet', icon: WalletIcon, when: (c) => c.walletBalance > 0 },
]

// Friendly page titles keyed by pathname (used by the top bar).
export const DASHBOARD_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/performance': 'Performance',
  '/dashboard/test-series': 'Test Series',
  '/dashboard/notes': 'Notes',
  '/dashboard/miscellaneous': 'Miscellaneous',
  '/dashboard/mentorship': 'Mentorship',
  '/dashboard/pricing': 'Pricing',
  '/dashboard/profile': 'Profile',
  '/dashboard/invoice': 'Invoice',
  '/dashboard/wallet': 'Wallet',
}
