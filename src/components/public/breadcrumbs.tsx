// MY CS MTP — Visible breadcrumb component used across public SEO pages.
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export type Crumb = { name: string; href?: string }

export function PublicBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <div className="container mx-auto px-4 pt-6 max-w-6xl">
      <Breadcrumb>
        <BreadcrumbList>
          {items.map((c, i) => {
            const isLast = i === items.length - 1
            return (
              <BreadcrumbItem key={i}>
                {c.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link href={c.href}>{c.name}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="line-clamp-1">{c.name}</BreadcrumbPage>
                )}
                {!isLast && <BreadcrumbSeparator />}
              </BreadcrumbItem>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}
