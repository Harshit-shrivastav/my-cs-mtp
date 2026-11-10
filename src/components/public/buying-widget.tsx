'use client'
import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { notifyCartChanged } from '@/components/cart/cart-context'
import { ShoppingCart, Loader2, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils-extra'

export interface BuyingSubject {
  planSubjectId: string
  subjectId: string
  subjectName: string
  originalPrice: number
  offerPrice: number
}

export interface BuyingPlan {
  planId: string
  planName: string
  planSlug: string
  courseName: string
  courseSlug: string
  subjects: BuyingSubject[]
}

export function BuyingWidget({ plan }: { plan: BuyingPlan }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [adding, setAdding] = useState(false)
  const subjectsBeforeViewMore = 4 // hard-coded sensible default; admin can also push via settings

  const visible = showAll ? plan.subjects : plan.subjects.slice(0, subjectsBeforeViewMore)
  const hiddenCount = plan.subjects.length - subjectsBeforeViewMore

  const totals = useMemo(() => {
    let original = 0, offer = 0
    for (const s of plan.subjects) {
      if (selected.has(s.planSubjectId)) {
        original += s.originalPrice
        offer += s.offerPrice
      }
    }
    return { original, offer }
  }, [selected, plan.subjects])

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function selectAll() {
    if (selected.size === plan.subjects.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(plan.subjects.map((s) => s.planSubjectId)))
    }
  }

  async function addToCart() {
    if (selected.size === 0) {
      toast.error('Please select at least one subject.')
      return
    }
    setAdding(true)
    try {
      const r = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.planId,
          planSubjectIds: Array.from(selected),
        }),
      })
      const data = await r.json()
      if (r.ok) {
        toast.success(`Added ${selected.size} subject${selected.size > 1 ? 's' : ''} to cart.`)
        notifyCartChanged()
      } else {
        if (r.status === 401) {
          // Save selection intent and redirect to login
          sessionStorage.setItem('cart_intent', JSON.stringify({ planId: plan.planId, planSubjectIds: Array.from(selected) }))
          toast.error('Please log in to add items to your cart.')
          setTimeout(() => window.location.href = '/login', 1200)
        } else {
          toast.error(data.error || 'Could not add to cart')
        }
      }
    } finally {
      setAdding(false)
    }
  }

  async function buyNow() {
    if (selected.size === 0) {
      toast.error('Please select at least one subject.')
      return
    }
    setAdding(true)
    try {
      const r = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.planId,
          planSubjectIds: Array.from(selected),
        }),
      })
      if (r.ok) {
        window.location.href = '/cart'
      } else {
        const data = await r.json()
        if (r.status === 401) {
          sessionStorage.setItem('cart_intent', JSON.stringify({ planId: plan.planId, planSubjectIds: Array.from(selected) }))
          toast.error('Please log in to checkout.')
          setTimeout(() => window.location.href = '/login', 1200)
        } else {
          toast.error(data.error || 'Could not add to cart')
        }
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{plan.planName}</CardTitle>
          <Badge variant="secondary">{plan.courseName}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <button onClick={selectAll} className="text-muted-foreground hover:text-foreground underline">
            {selected.size === plan.subjects.length ? 'Deselect all' : 'Select all'}
          </button>
          <span className="text-muted-foreground">
            {selected.size} selected
          </span>
        </div>

        <div className="space-y-2">
          {visible.map((s) => {
            const checked = selected.has(s.planSubjectId)
            return (
              <label key={s.planSubjectId} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer border border-transparent has-[:checked]:border-border has-[:checked]:bg-muted/30">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(s.planSubjectId)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight">{s.subjectName}</div>
                  <div className="flex items-center gap-2 text-xs mt-0.5">
                    <span className="font-semibold">{formatCurrency(s.offerPrice)}</span>
                    {s.originalPrice > s.offerPrice && (
                      <span className="text-muted-foreground line-through">{formatCurrency(s.originalPrice)}</span>
                    )}
                  </div>
                </div>
              </label>
            )
          })}
        </div>

        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {showAll ? 'Show fewer' : `+${hiddenCount} more subject${hiddenCount > 1 ? 's' : ''}`}
          </button>
        )}

        {selected.size > 0 && (
          <div className="border-t pt-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground line-through">{formatCurrency(totals.original)}</span>
              <span className="font-semibold text-lg">{formatCurrency(totals.offer)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={addToCart} disabled={adding} variant="outline" className="flex-1">
                {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                Add to cart
              </Button>
              <Button onClick={buyNow} disabled={adding} className="flex-1">
                {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Buy now
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
