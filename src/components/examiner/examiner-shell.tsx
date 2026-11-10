'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { EXAMINER_NAV, EXAMINER_TITLES } from '@/components/examiner/nav'
import { Menu, LogOut, X, ClipboardCheck } from 'lucide-react'

export interface ExaminerCounts {
  total: number
  pending: number
  evaluated: number
}

interface ExaminerShellProps {
  user: { name: string | null; email: string }
  counts: ExaminerCounts
  siteName: string
  children: React.ReactNode
}

export function ExaminerShell({ user, counts, siteName, children }: ExaminerShellProps) {
  const pathname = usePathname() || '/examiner'
  const [mobileOpen, setMobileOpen] = useState(false)

  const pageTitle = EXAMINER_TITLES[pathname] || (pathname.startsWith('/examiner/evaluate/') ? 'Evaluate Assignment' : 'Examiner')

  function isActive(href: string) {
    if (href === '/examiner') return pathname === '/examiner'
    return pathname === href || pathname.startsWith(href + '/')
  }

  function handleLogout() {
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
        <Link href="/examiner" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            MTP
          </span>
          <span className="truncate">{siteName}</span>
        </Link>
        <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium truncate">
            <ClipboardCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{user.name || user.email.split('@')[0]}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground truncate">{user.email}</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <CountTile label="Total" value={counts.total} />
            <CountTile label="Pending" value={counts.pending} />
            <CountTile label="Evaluated" value={counts.evaluated} />
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {EXAMINER_NAV.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            const countValue = item.countKey ? counts[item.countKey] : undefined
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
                  <span className="truncate flex-1">{item.label}</span>
                  {typeof countValue === 'number' && (
                    <span
                      className={`ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                        active
                          ? 'bg-primary-foreground/15 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {countValue}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t p-3">
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
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
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-background/70 px-2 py-1.5">
      <div className="text-sm font-semibold tabular-nums leading-none">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  )
}
