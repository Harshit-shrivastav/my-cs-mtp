'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { DASHBOARD_NAV, DASHBOARD_TITLES } from '@/components/dashboard/nav'
import { formatCurrency } from '@/lib/utils-extra'
import { Menu, LogOut, X, Wallet } from 'lucide-react'

interface DashboardShellProps {
  user: {
    id: string
    name: string | null
    email: string
    courseId: string | null
    courseName: string | null
  }
  walletBalance: number
  currencySymbol: string
  siteName: string
  children: React.ReactNode
}

export function DashboardShell({
  user,
  walletBalance,
  currencySymbol,
  siteName,
  children,
}: DashboardShellProps) {
  const pathname = usePathname() || '/dashboard'
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const pageTitle = DASHBOARD_TITLES[pathname] || 'Dashboard'
  const navItems = DASHBOARD_NAV.filter((item) => !item.when || item.when({ walletBalance }))

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  function handleLogout() {
    // Plain form POST so the cookie gets cleared even without JS
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/auth/logout'
    document.body.appendChild(form)
    form.submit()
  }

  const sidebarInner = (
    <div className="flex h-full flex-col">
      {/* Brand + user block */}
      <div className="border-b px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            MTP
          </span>
          <span className="truncate">{siteName}</span>
        </Link>
        <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm">
          <div className="font-medium truncate">{user.name || user.email.split('@')[0]}</div>
          {user.courseName && (
            <div className="text-xs text-muted-foreground truncate">{user.courseName}</div>
          )}
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" />
              Wallet
            </span>
            <span className="font-semibold">{formatCurrency(walletBalance, currencySymbol)}</span>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t p-3">
        <Button onClick={handleLogout} variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col border-r bg-background">
        {sidebarInner}
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              {/* Mobile menu trigger */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[260px] p-0">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <div className="flex items-center justify-between border-b px-4 py-3 md:hidden">
                    <span className="font-semibold text-sm">Close menu</span>
                    <SheetClose asChild>
                      <Button variant="ghost" size="icon" aria-label="Close menu">
                        <X className="h-5 w-5" />
                      </Button>
                    </SheetClose>
                  </div>
                  {sidebarInner}
                </SheetContent>
              </Sheet>
              <h1 className="text-base font-semibold">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm text-muted-foreground">
                {user.name || user.email.split('@')[0]}
              </span>
              <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// Convenience helper so pages can re-route after profile updates.
export function useRefresh() {
  const router = useRouter()
  return () => router.refresh()
}
