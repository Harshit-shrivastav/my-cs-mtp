import Link from 'next/link'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getCurrentUser } from '@/lib/server-auth'
import { CartBadgeOverlay, CartBadgeInline } from '@/components/cart/cart-badge'
import { ShoppingCart, Menu, X, LogOut, LayoutDashboard, User as UserIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { publicUrl } from '@/lib/storage'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

async function getMenuData() {
  const [courses, headerPages] = await Promise.all([
    db.course.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    db.customPage.findMany({ where: { isActive: true, showInHeader: true }, orderBy: { title: 'asc' } }),
  ])
  return { courses, headerPages }
}

const LANDING_LINKS = [
  { href: '/cs-test-series', label: 'CS Test Series' },
  { href: '/cseet-test-series', label: 'CSEET' },
  { href: '/cs-executive-test-series', label: 'CS Executive' },
  { href: '/cs-professional-test-series', label: 'CS Professional' },
  { href: '/cs-test-series-review', label: 'Reviews' },
  { href: '/cstestseriesschedule', label: 'Schedules' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
]

export async function PublicHeader() {
  const [s, user, menu] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    getMenuData(),
  ])

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Logo + site name */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg shrink-0">
          {s.logoKey ? (
            <img
              src={publicUrl(s.logoKey) || ''}
              alt={s.siteName + ' logo'}
              className="h-8 w-8 object-contain"
            />
          ) : (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              MTP
            </span>
          )}
          <span className="hidden sm:inline">{s.siteName}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
          {LANDING_LINKS.slice(0, 5).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                Courses
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {menu.courses.map((c) => (
                <DropdownMenuItem key={c.id} asChild>
                  <Link href={`/course/${c.slug}`} className="w-full">{c.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {LANDING_LINKS.slice(5).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {l.label}
            </Link>
          ))}
          {menu.headerPages.map((p) => (
            <Link
              key={p.id}
              href={`/${p.slug}`}
              className="px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {p.title}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/cart" aria-label="Cart" className="relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted">
            <ShoppingCart className="h-5 w-5" />
            <CartBadgeOverlay />
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="hidden sm:inline">{user.name || user.email.split('@')[0]}</span>
                  <span className="sm:hidden"><UserIcon className="h-4 w-4" /></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user.role === 'STUDENT' && (
                  <DropdownMenuItem asChild><Link href="/dashboard"><LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard</Link></DropdownMenuItem>
                )}
                {user.role === 'EXAMINER' && (
                  <DropdownMenuItem asChild><Link href="/examiner"><LayoutDashboard className="h-4 w-4 mr-2" /> Examiner</Link></DropdownMenuItem>
                )}
                {user.role === 'ADMIN' && (
                  <DropdownMenuItem asChild><Link href="/admin"><LayoutDashboard className="h-4 w-4 mr-2" /> Admin</Link></DropdownMenuItem>
                )}
                {user.role === 'STUDENT' && (
                  <DropdownMenuItem asChild><Link href="/dashboard/profile"><UserIcon className="h-4 w-4 mr-2" /> Profile</Link></DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action="/api/auth/logout" method="POST" className="w-full">
                    <button type="submit" className="w-full text-left flex items-center">
                      <LogOut className="h-4 w-4 mr-2" /> Logout
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-1">
              <Button asChild variant="ghost" size="sm"><Link href="/login">Login</Link></Button>
              <Button asChild size="sm"><Link href="/signup">Sign Up</Link></Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[320px] p-0 overflow-y-auto [&>button]:hidden">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-5 h-16 border-b shrink-0">
                  <span className="font-semibold text-base">{s.siteName}</span>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" aria-label="Close menu"><X className="h-5 w-5" /></Button>
                  </SheetClose>
                </div>
                <nav className="flex flex-col gap-0.5 px-3 py-4">
                  <SheetClose asChild>
                    <Link href="/cart" className="flex items-center justify-between px-3 py-2.5 text-[15px] rounded-lg hover:bg-muted font-medium">
                      <span className="flex items-center gap-2.5"><ShoppingCart className="h-5 w-5" /> Cart</span>
                      <CartBadgeInline />
                    </Link>
                  </SheetClose>
                  {[...LANDING_LINKS, ...menu.headerPages.map((p) => ({ href: `/${p.slug}`, label: p.title }))].map((l) => (
                    <SheetClose asChild key={l.href}>
                      <Link href={l.href} className="px-3 py-2.5 text-[15px] font-medium rounded-lg hover:bg-muted">
                        {l.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                <div className="mt-auto border-t px-5 py-4 shrink-0">
                  {user ? (
                    <div className="flex flex-col gap-2">
                      {user.role === 'STUDENT' && <SheetClose asChild><Button asChild className="w-full"><Link href="/dashboard">Dashboard</Link></Button></SheetClose>}
                      {user.role === 'EXAMINER' && <SheetClose asChild><Button asChild className="w-full"><Link href="/examiner">Examiner</Link></Button></SheetClose>}
                      {user.role === 'ADMIN' && <SheetClose asChild><Button asChild className="w-full"><Link href="/admin">Admin</Link></Button></SheetClose>}
                      <form action="/api/auth/logout" method="POST">
                        <Button type="submit" variant="outline" className="w-full">Logout</Button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <SheetClose asChild>
                        <Button asChild className="w-full"><Link href="/signup">Sign Up</Link></Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button asChild variant="outline" className="w-full"><Link href="/login">Login</Link></Button>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
