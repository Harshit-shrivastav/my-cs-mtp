'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, UserCog } from 'lucide-react'

interface Examiner {
  id: string
  name: string | null
  email: string
  examinerPapers: { paperId: string }[]
  examinerSubjects: { subjectId: string }[]
}

export function AssignExaminerActions({
  assignmentId,
  paperId,
  paperSubjectId,
  paperCourseId,
  examiners,
  currentExaminerId,
}: {
  assignmentId: string
  paperId: string
  paperSubjectId: string
  paperCourseId: string
  examiners: Examiner[]
  currentExaminerId?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState(currentExaminerId || '')
  const [busy, setBusy] = useState(false)

  // Build examiner options. Score each examiner by how well they match the
  // paper's scope: paper-link > subject-link > any.
  const sorted = [...examiners].sort((a, b) => {
    const aScore = score(a)
    const bScore = score(b)
    return bScore - aScore
  })

  function score(e: Examiner): number {
    let s = 0
    if (e.examinerPapers.some((p) => p.paperId === paperId)) s += 2
    if (e.examinerSubjects.some((s) => s.subjectId === paperSubjectId)) s += 1
    return s
  }

  async function assign(e: React.FormEvent) {
    e.preventDefault()
    if (!chosen) {
      toast.error('Select an examiner.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/assignments/${assignmentId}/assign-examiner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examinerId: chosen }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success('Examiner assigned.')
      setOpen(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <UserCog className="h-3.5 w-3.5" />
          {currentExaminerId ? 'Reassign' : 'Assign'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign examiner</DialogTitle>
          <DialogDescription>Examiners with scope on this paper appear first.</DialogDescription>
        </DialogHeader>
        <form onSubmit={assign} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="examiner" className="text-sm font-medium">Examiner</label>
            <select
              id="examiner"
              value={chosen}
              onChange={(e) => setChosen(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
            >
              <option value="">Select…</option>
              {sorted.map((e) => {
                const s = score(e)
                const tag = s >= 2 ? 'paper-scope' : s === 1 ? 'subject-scope' : 'general'
                return (
                  <option key={e.id} value={e.id}>
                    {e.name || e.email.split('@')[0]} — {e.email} ({tag})
                  </option>
                )
              })}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
