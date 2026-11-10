'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useRef } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function BlogSearchClient({ initialQ }: { initialQ: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = useState(initialQ || '')
  const t = useRef<ReturnType<typeof setTimeout> | null>(null)

  function pushSearch(value: string) {
    if (t.current) clearTimeout(t.current)
    t.current = setTimeout(() => {
      const sp = new URLSearchParams(params.toString())
      if (!value) sp.delete('q')
      else sp.set('q', value)
      sp.delete('page')
      const qs = sp.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, 300)
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          pushSearch(e.target.value)
        }}
        placeholder="Search posts by title, excerpt or tag…"
        className="pl-9"
        aria-label="Search blog posts"
      />
    </div>
  )
}
