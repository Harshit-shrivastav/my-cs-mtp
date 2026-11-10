'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination'

interface PaginationControlsProps {
  page: number
  totalPages: number
  /** Preserve current search params (other than `page`). */
  paramName?: string
}

/** Server-side pagination — pushes `?page=N` into the URL. */
export function PaginationControls({ page, totalPages, paramName = 'page' }: PaginationControlsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  function hrefFor(p: number): string {
    const sp = new URLSearchParams(searchParams.toString())
    if (p > 1) sp.set(paramName, String(p))
    else sp.delete(paramName)
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function goTo(p: number) {
    if (p < 1 || p > totalPages) return
    router.push(hrefFor(p))
  }

  // Build a compact list of page numbers around the current page.
  const pages: (number | 'ellipsis')[] = []
  const window = 1
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= window) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis')
    }
  }

  return (
    <Pagination className="mt-4 justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={page > 1 ? hrefFor(page - 1) : '#'}
            onClick={(e) => {
              if (page <= 1) {
                e.preventDefault()
                return
              }
              e.preventDefault()
              goTo(page - 1)
            }}
            aria-disabled={page <= 1}
            className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>
        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <PaginationItem key={`e-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                href={hrefFor(p)}
                isActive={p === page}
                onClick={(e) => {
                  e.preventDefault()
                  goTo(p)
                }}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          )
        )}
        <PaginationItem>
          <PaginationNext
            href={page < totalPages ? hrefFor(page + 1) : '#'}
            onClick={(e) => {
              if (page >= totalPages) {
                e.preventDefault()
                return
              }
              e.preventDefault()
              goTo(page + 1)
            }}
            aria-disabled={page >= totalPages}
            className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

/** Filter select that pushes a param into the URL. */
export function AdminFilterSelect({
  param,
  options,
  placeholder = 'All',
  value,
  preserveParams = true,
}: {
  param: string
  options: { value: string; label: string }[]
  placeholder?: string
  value?: string
  preserveParams?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = value ?? searchParams.get(param) ?? ''

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sp = new URLSearchParams(preserveParams ? searchParams.toString() : '')
    if (e.target.value) sp.set(param, e.target.value)
    else sp.delete(param)
    // Reset pagination when filter changes
    sp.delete('page')
    const qs = sp.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <select
      value={current}
      onChange={onChange}
      className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function AdminLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
