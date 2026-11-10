// MY CS MTP — Admin area navigation config (shared by the layout & mobile sheet).
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Layers,
  FileText,
  NotebookPen,
  Files,
  CalendarClock,
  ClipboardCheck,
  ShoppingCart,
  Ticket,
  Gift,
  CalendarDays,
  UserCog,
  Mail,
  Wallet,
  CreditCard,
  Clock,
  Bell,
  Newspaper,
  Megaphone,
  FileEdit,
  Share2,
  Sparkles,
  Bot,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface AdminNavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/plans', label: 'Plans', icon: ClipboardList },
  { href: '/admin/subjects', label: 'Subjects', icon: Layers },
  { href: '/admin/papers', label: 'Papers', icon: FileText },
  { href: '/admin/notes', label: 'Notes', icon: NotebookPen },
  { href: '/admin/miscellaneous', label: 'Miscellaneous', icon: Files },
  { href: '/admin/mentorship', label: 'Mentorship', icon: CalendarClock },
  { href: '/admin/assignments', label: 'Assignments', icon: ClipboardCheck },
  { href: '/admin/sales', label: 'Sales', icon: ShoppingCart },
  { href: '/admin/promo-codes', label: 'Promo Codes', icon: Ticket },
  { href: '/admin/free-resources', label: 'Free Resources', icon: Gift },
  { href: '/admin/schedules', label: 'Schedules', icon: CalendarDays },
  { href: '/admin/examiners', label: 'Examiners', icon: UserCog },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Mail },
  { href: '/admin/wallet', label: 'Wallet', icon: Wallet },
  { href: '/admin/payment-gateway', label: 'Payment Gateway', icon: CreditCard },
  { href: '/admin/exam-timing', label: 'Exam Timing', icon: Clock },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/blog', label: 'Blog', icon: Newspaper },
  { href: '/admin/marketing', label: 'Marketing/Leads', icon: Megaphone },
  { href: '/admin/custom-pages', label: 'Custom Pages', icon: FileEdit },
  { href: '/admin/referral-config', label: 'Referral Config', icon: Share2 },
  { href: '/admin/promotional-wallet', label: 'Promotional Wallet Config', icon: Sparkles },
  { href: '/admin/ai-config', label: 'AI Config', icon: Bot },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

// Friendly page titles keyed by pathname prefix (used by the top bar).
export function adminTitleForPath(pathname: string): string {
  const item = ADMIN_NAV.find((n) =>
    n.href === '/admin' ? pathname === '/admin' : pathname === n.href || pathname.startsWith(n.href + '/')
  )
  if (item) {
    if (item.href === '/admin') return 'Admin Panel'
    return item.label
  }
  return 'Admin Panel'
}
