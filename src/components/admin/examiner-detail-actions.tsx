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
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { toast } from 'sonner'
import { Loader2, FileText, Layers, Trash2, X } from 'lucide-react'

export interface PaperOption {
  id: string
  title: string
  courseName: string | null
  planName: string | null
  subjectName: string | null
}

export interface SubjectOption {
  id: string
  name: string
  courseName: string | null
}

/** Dialog to assign a paper to the examiner. */
export function AssignPaperDialog({ examinerId, papers }: { examinerId: string; papers: PaperOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState('')
  const [busy, setBusy] = useState(false)

  async function assign(e: React.FormEvent) {
    e.preventDefault()
    if (!chosen) {
      toast.error('Select a paper.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/examiners/${examinerId}/papers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId: chosen }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success('Paper assigned.')
      setOpen(false)
      setChosen('')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <FileText className="h-3.5 w-3.5" />
        Assign paper
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign paper</DialogTitle>
          <DialogDescription>
            The examiner will see this paper in their evaluation queue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={assign} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="paper" className="text-sm font-medium">Paper</label>
            <select
              id="paper"
              value={chosen}
              onChange={(e) => setChosen(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
            >
              <option value="">Select a paper…</option>
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.courseName ?? '—'} · {p.planName ?? '—'} · {p.subjectName ?? '—'} · {p.title}
                </option>
              ))}
            </select>
            {papers.length === 0 && (
              <p className="text-xs text-muted-foreground">No papers exist yet — create papers first.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !chosen} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Dialog to assign a subject to the examiner. */
export function AssignSubjectDialog({ examinerId, subjects }: { examinerId: string; subjects: SubjectOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState('')
  const [busy, setBusy] = useState(false)

  async function assign(e: React.FormEvent) {
    e.preventDefault()
    if (!chosen) {
      toast.error('Select a subject.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/examiners/${examinerId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: chosen }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success('Subject assigned.')
      setOpen(false)
      setChosen('')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <Layers className="h-3.5 w-3.5" />
        Assign subject
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign subject</DialogTitle>
          <DialogDescription>Grants the examiner scope over this subject.</DialogDescription>
        </DialogHeader>
        <form onSubmit={assign} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="subject" className="text-sm font-medium">Subject</label>
            <select
              id="subject"
              value={chosen}
              onChange={(e) => setChosen(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
            >
              <option value="">Select a subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.courseName ?? '—'} · {s.name}
                </option>
              ))}
            </select>
            {subjects.length === 0 && (
              <p className="text-xs text-muted-foreground">No subjects exist yet — create subjects first.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !chosen} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Unassign a paper (with confirm). */
export function UnassignPaperButton({ examinerId, paperId, title }: { examinerId: string; paperId: string; title?: string }) {
  const router = useRouter()
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
          <X className="h-3.5 w-3.5" />
          Unassign
        </Button>
      }
      title="Unassign paper?"
      description={title ? <>Remove <strong>{title}</strong> from this examiner&apos;s scope?</> : 'Remove this paper from the examiner?'}
      confirmLabel="Unassign"
      successMessage="Paper unassigned."
      onConfirm={async () => {
        const r = await fetch(`/api/admin/examiners/${examinerId}/papers?paperId=${encodeURIComponent(paperId)}`, {
          method: 'DELETE',
        })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Failed.')
        router.refresh()
      }}
    />
  )
}

/** Unassign a subject (with confirm). */
export function UnassignSubjectButton({ examinerId, subjectId, name }: { examinerId: string; subjectId: string; name?: string }) {
  const router = useRouter()
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
          <X className="h-3.5 w-3.5" />
          Unassign
        </Button>
      }
      title="Unassign subject?"
      description={name ? <>Remove <strong>{name}</strong> from this examiner&apos;s scope?</> : 'Remove this subject from the examiner?'}
      confirmLabel="Unassign"
      successMessage="Subject unassigned."
      onConfirm={async () => {
        const r = await fetch(`/api/admin/examiners/${examinerId}/subjects?subjectId=${encodeURIComponent(subjectId)}`, {
          method: 'DELETE',
        })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Failed.')
        router.refresh()
      }}
    />
  )
}

/** Delete the examiner account (redirects back to the list). */
export function DeleteExaminerButton({ examinerId, name, email }: { examinerId: string; name: string | null; email: string }) {
  const router = useRouter()
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
          Delete examiner
        </Button>
      }
      title="Delete examiner?"
      description={`This will permanently delete ${name || email}. Their paper/subject assignments are removed and submitted evaluations stay in the system (unassigned). This action cannot be undone.`}
      confirmLabel="Delete"
      successMessage="Examiner deleted."
      onConfirm={async () => {
        const r = await fetch(`/api/admin/examiners/${examinerId}`, { method: 'DELETE' })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Failed.')
        router.push('/admin/examiners')
        router.refresh()
      }}
    />
  )
}
