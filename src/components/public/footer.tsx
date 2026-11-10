import Link from 'next/link'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin, MessageCircle } from 'lucide-react'

async function getFooterData() {
  const [courses, footerPages] = await Promise.all([
    db.course.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, slug: true } }),
    db.customPage.findMany({ where: { isActive: true, showInFooter: true }, orderBy: { title: 'asc' }, select: { id: true, title: true, slug: true } }),
  ])
  return { courses, footerPages }
}

const LANDING_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/cs-test-series', label: 'CS Test Series' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/cstestseriesschedule', label: 'Schedules' },
  { href: '/cs-test-series-review', label: 'Reviews' },
]

export async function PublicFooter() {
  const [s, data] = await Promise.all([getSettings(), getFooterData()])
  const year = new Date().getFullYear()

  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand + contact */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{s.siteName}</h3>
            <p className="text-sm text-muted-foreground">{s.tagline}</p>
            <ul className="space-y-1.5 text-sm">
              {s.supportEmail && (
                <li><a href={`mailto:${s.supportEmail}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"><Mail className="h-4 w-4" /> {s.supportEmail}</a></li>
              )}
              {s.supportPhone && (
                <li><a href={`tel:${s.supportPhone}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"><Phone className="h-4 w-4" /> {s.supportPhone}</a></li>
              )}
              {s.address && (
                <li className="inline-flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {s.address}</li>
              )}
            </ul>
            {/* Social */}
            <div className="flex items-center gap-2 pt-2">
              {s.facebook && <a href={s.facebook} aria-label="Facebook" className="text-muted-foreground hover:text-foreground" target="_blank" rel="noopener noreferrer"><Facebook className="h-5 w-5" /></a>}
              {s.instagram && <a href={s.instagram} aria-label="Instagram" className="text-muted-foreground hover:text-foreground" target="_blank" rel="noopener noreferrer"><Instagram className="h-5 w-5" /></a>}
              {s.twitter && <a href={s.twitter} aria-label="Twitter" className="text-muted-foreground hover:text-foreground" target="_blank" rel="noopener noreferrer"><Twitter className="h-5 w-5" /></a>}
              {s.youtube && <a href={s.youtube} aria-label="YouTube" className="text-muted-foreground hover:text-foreground" target="_blank" rel="noopener noreferrer"><Youtube className="h-5 w-5" /></a>}
              {s.whatsappLink && <a href={s.whatsappLink} aria-label="WhatsApp" className="text-muted-foreground hover:text-foreground" target="_blank" rel="noopener noreferrer"><MessageCircle className="h-5 w-5" /></a>}
            </div>
          </div>

          {/* Landing pages */}
          <div>
            <h4 className="font-medium mb-3">Explore</h4>
            <ul className="space-y-1.5 text-sm">
              {LANDING_LINKS.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-muted-foreground hover:text-foreground">{l.label}</Link></li>
              ))}
              <li><Link href="/cseet-test-series" className="text-muted-foreground hover:text-foreground">CSEET Test Series</Link></li>
              <li><Link href="/cs-executive-test-series" className="text-muted-foreground hover:text-foreground">CS Executive Test Series</Link></li>
              <li><Link href="/cs-professional-test-series" className="text-muted-foreground hover:text-foreground">CS Professional Test Series</Link></li>
            </ul>
          </div>

          {/* Courses */}
          <div>
            <h4 className="font-medium mb-3">Courses</h4>
            <ul className="space-y-1.5 text-sm">
              {data.courses.map((c) => (
                <li key={c.id}><Link href={`/course/${c.slug}`} className="text-muted-foreground hover:text-foreground">{c.name}</Link></li>
              ))}
            </ul>
          </div>

          {/* Custom pages */}
          <div>
            <h4 className="font-medium mb-3">Company</h4>
            <ul className="space-y-1.5 text-sm">
              {data.footerPages.map((p) => (
                <li key={p.id}><Link href={`/${p.slug}`} className="text-muted-foreground hover:text-foreground">{p.title}</Link></li>
              ))}
              <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">© {year} {s.siteName}. All rights reserved. Independent test series platform for Company Secretary students.</p>
          <p className="text-xs text-muted-foreground">Not affiliated with ICSI or any other coaching brand.</p>
        </div>
      </div>
    </footer>
  )
}
