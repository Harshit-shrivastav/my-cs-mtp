'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CrudActions, CrudDelete } from '@/components/admin/crud-actions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Pencil, Trash2, Layers } from 'lucide-react'

interface CourseOption {
  id: string
  name: string
}

interface PlanListItem {
  id: string
  name: string
  slug: string
  isActive: boolean
  sortOrder: number
  scheduleFileKey: string | null
  course: { id: string; name: string }
  _count: { planSubjects: number; papers: number }
}

const PLAN_FIELDS = (courses: CourseOption[]) => [
  { name: 'name', label: 'Name', type: 'text' as const, required: true, placeholder: 'e.g. CSEET Premium' },
  { name: 'slug', label: 'Slug', type: 'text' as const, required: true, placeholder: 'auto-generated', autoSlugFrom: 'name' },
  { name: 'courseId', label: 'Course', type: 'select' as const, required: true, options: courses.map((c) => ({ value: c.id, label: c.name })), selectPlaceholder: 'Select course' },
  { name: 'description', label: 'Description', type: 'textarea' as const },
  { name: 'tags', label: 'Tags', type: 'text' as const, placeholder: 'comma-separated tags' },
  { name: 'scheduleFileKey', label: 'Schedule file', type: 'file' as const, keyPrefix: 'plans', acceptExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx'], helpText: 'PDF, DOC, DOCX, XLS, XLSX' },
  { name: 'isActive', label: 'Active', type: 'switch' as const },
  { name: 'sortOrder', label: 'Sort order', type: 'number' as const, min: '0', step: '1', placeholder: '0' },
  { name: 'seoTitle', label: 'SEO title', type: 'text' as const },
  { name: 'seoDescription', label: 'SEO description', type: 'textarea' as const },
  { name: 'seoKeywords', label: 'SEO keywords', type: 'text' as const, placeholder: 'comma-separated' },
  { name: 'ogImageKey', label: 'OG image', type: 'image' as const, keyPrefix: 'seo/plans' },
]

export function PlanListActions({ plan, courses }: { plan: PlanListItem; courses: CourseOption[] }) {
  const router = useRouter()
  const [subjectsOpen, setSubjectsOpen] = useState(false)
  return (
    <div className="flex items-center justify-end gap-2">
      <Button asChild size="sm" variant="outline" className="gap-1.5">
        <Link href={`/admin/plans/${plan.id}`}>
          <Layers className="h-3.5 w-3.5" />
          Subjects
        </Link>
      </Button>
      <CrudActions
        endpoint="/api/admin/plans"
        fields={PLAN_FIELDS(courses)}
        title="Edit plan"
        description={plan.name}
        initial={plan}
        submitLabel="Save changes"
      />
      <CrudDelete
        endpoint="/api/admin/plans"
        id={plan.id}
        description={<>Delete plan <strong>{plan.name}</strong>? This will cascade-delete its plan-subjects and all related cart items and purchases.</>}
      />
      {/* subjectsOpen unused — the Subjects button navigates instead */}
      <input type="hidden" value={subjectsOpen ? '1' : ''} onChange={(e) => setSubjectsOpen(e.target.value === '1')} />
    </div>
  )
}

interface PlanSubjectRow {
  id: string
  subjectId: string
  subject: { id: string; name: string }
  originalPrice: number
  offerPrice: number
  isActive: boolean
}

interface PlanSubjectsManagerProps {
  planId: string
  courseId: string
  subjects: { id: string; name: string; isActive: boolean }[]
  planSubjects: PlanSubjectRow[]
}

export function PlanSubjectsManager({ planId, courseId, subjects, planSubjects }: PlanSubjectsManagerProps) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  // Local edits
  const [edits, setEdits] = useState<Record<string, { originalPrice: string; offerPrice: string; isActive: boolean }>>({})

  function initEdits() {
    const e: Record<string, { originalPrice: string; offerPrice: string; isActive: boolean }> = {}
    for (const ps of planSubjects) {
      e[ps.id] = {
        originalPrice: String(ps.originalPrice),
        offerPrice: String(ps.offerPrice),
        isActive: ps.isActive,
      }
    }
    setEdits(e)
  }

  async function saveRow(psId: string) {
    const e = edits[psId]
    if (!e) return
    setBusy(psId)
    try {
      const r = await fetch(`/api/admin/plan-subjects/${psId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrice: Number(e.originalPrice) || 0,
          offerPrice: Number(e.offerPrice) || 0,
          isActive: e.isActive,
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success('Saved.')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(null)
    }
  }

  async function deleteRow(psId: string) {
    setBusy(psId)
    try {
      const r = await fetch(`/api/admin/plan-subjects/${psId}`, { method: 'DELETE' })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success('Removed.')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(null)
    }
  }

  // Add subject form
  const [addSubjectId, setAddSubjectId] = useState('')
  const [addOriginalPrice, setAddOriginalPrice] = useState('')
  const [addOfferPrice, setAddOfferPrice] = useState('')
  const [adding, setAdding] = useState(false)

  // Available subjects = subjects of this course not yet linked to the plan
  const linkedSubjectIds = new Set(planSubjects.map((p) => p.subjectId))
  const availableSubjects = subjects.filter((s) => !linkedSubjectIds.has(s.id))

  async function addSubject(e: React.FormEvent) {
    e.preventDefault()
    if (!addSubjectId) {
      toast.error('Select a subject.')
      return
    }
    setAdding(true)
    try {
      const r = await fetch(`/api/admin/plans/${planId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: addSubjectId,
          originalPrice: Number(addOriginalPrice) || 0,
          offerPrice: Number(addOfferPrice) || 0,
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success('Subject added.')
      setAddSubjectId('')
      setAddOriginalPrice('')
      setAddOfferPrice('')
      setOpen(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setAddSubjectId(''); setAddOriginalPrice(''); setAddOfferPrice('') } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" disabled={availableSubjects.length === 0}>
              <Layers className="h-3.5 w-3.5" />
              Add subject
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add subject to plan</DialogTitle>
              <DialogDescription>Choose a subject and set the prices.</DialogDescription>
            </DialogHeader>
            <form onSubmit={addSubject} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-subject">Subject</Label>
                <select
                  id="add-subject"
                  value={addSubjectId}
                  onChange={(e) => setAddSubjectId(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
                >
                  <option value="">Select…</option>
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="add-original">Original price (₹)</Label>
                  <Input
                    id="add-original"
                    type="number"
                    step="0.01"
                    min="0"
                    value={addOriginalPrice}
                    onChange={(e) => setAddOriginalPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-offer">Offer price (₹)</Label>
                  <Input
                    id="add-offer"
                    type="number"
                    step="0.01"
                    min="0"
                    value={addOfferPrice}
                    onChange={(e) => setAddOfferPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={adding} className="gap-1.5">
                  {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Add
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {planSubjects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subjects linked to this plan yet.</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Subject</th>
                <th className="text-right px-3 py-2 font-medium">Original price (₹)</th>
                <th className="text-right px-3 py-2 font-medium">Offer price (₹)</th>
                <th className="text-left px-3 py-2 font-medium">Active</th>
                <th className="text-right px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {planSubjects.map((ps) => {
                const e = edits[ps.id] || { originalPrice: String(ps.originalPrice), offerPrice: String(ps.offerPrice), isActive: ps.isActive }
                return (
                  <tr key={ps.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{ps.subject.name}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={e.originalPrice}
                        onChange={(ev) => setEdits((prev) => ({ ...prev, [ps.id]: { ...e, originalPrice: ev.target.value } }))}
                        className="h-8 w-28 text-right"
                        disabled={busy === ps.id}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={e.offerPrice}
                        onChange={(ev) => setEdits((prev) => ({ ...prev, [ps.id]: { ...e, offerPrice: ev.target.value } }))}
                        className="h-8 w-28 text-right"
                        disabled={busy === ps.id}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={e.isActive}
                        onChange={(ev) => setEdits((prev) => ({ ...prev, [ps.id]: { ...e, isActive: ev.target.checked } }))}
                        className="h-4 w-4 rounded border"
                        disabled={busy === ps.id}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === ps.id}
                          onClick={() => saveRow(ps.id)}
                          className="h-8 gap-1.5"
                        >
                          {busy === ps.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === ps.id}
                          onClick={() => deleteRow(ps.id)}
                          className="h-8 gap-1.5 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={initEdits}
        className="text-xs"
      >
        Reset edits from saved values
      </Button>
    </div>
  )
}
