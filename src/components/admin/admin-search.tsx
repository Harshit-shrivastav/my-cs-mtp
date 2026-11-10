'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

interface AdminSearchProps {
  /** Query param name to update (defaults to "q"). */
  param?: string
  placeholder?: string
  /** Optional: keep other params like courseId. Defaults to keeping all. */
  preserveParams?: boolean
}

/** Client-side search box that pushes the value into the URL as `?q=...`. */
export function AdminSearch({ param = 'q', placeholder = 'Search…', preserveParams = true }: AdminSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initial = searchParams.get(param) || ''
  const [value, setValue] = useState(initial)

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const sp = new URLSearchParams(preserveParams ? searchParams.toString() : '')
    if (value) sp.set(param, value)
    else sp.delete(param)
    // Reset pagination on search
    sp.delete('page')
    const qs = sp.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function clear() {
    setValue('')
    const sp = new URLSearchParams(preserveParams ? searchParams.toString() : '')
    sp.delete(param)
    sp.delete('page')
    const qs = sp.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="pl-8 pr-8 h-9"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button type="submit" size="sm" variant="outline">Search</Button>
    </form>
  )
}
