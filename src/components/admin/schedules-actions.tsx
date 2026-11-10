'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/admin/file-upload'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { toast } from 'sonner'
import { Loader2, Save, Plus, Pencil, Trash2 } from 'lucide-react'

interface Course { id: string; name: string }
interface Plan { id: string; name: string; courseId: string }
interface ScheduleName { id: string; name: string; planId: string }

interface ScheduleListItem {
  id: string
  title: string
  description: string | null
  planId: string
  courseId: string
  scheduleNameId: string | null
  fileKey: string | null
  isPublic: boolean
  publishedAt: string | null
}

interface ScheduleFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  courses: Course[]
  plans: Plan[]
  scheduleNames: ScheduleName[]
  initial?: ScheduleListItem | null
}

export function ScheduleForm({
  open,
  onOpenChange,
  courses,
  plans,
  scheduleNames,
  initial,
}: ScheduleFormProps) {
  const router = useRouter()
  const isEdit = !!initial

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('')
  const [planId, setPlanId] = useState('')
  const [scheduleNameId, setScheduleNameId] = useState('')
  const [fileKey, setFileKey] = useState('')
  const [fileName, setFileName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [publishedAt, setPublishedAt] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setTitle(initial.title)
      setDescription(initial.description || '')
      setCourseId(initial.courseId)
      setPlanId(initial.planId)
      setScheduleNameId(initial.scheduleNameId || '')
      setFileKey(initial.fileKey || '')
      setFileName(initial.fileKey ? initial.fileKey.split('/').pop() || '' : '')
      setIsPublic(initial.isPublic)
      setPublishedAt(initial.publishedAt ? toLocalInput(initial.publishedAt) : '')
    } else {
      setTitle(''); setDescription(''); setCourseId(''); setPlanId(''); setScheduleNameId(''); setFileKey(''); setFileName(''); setIsPublic(false); setPublishedAt('')
    }
  }, [open, initial])

  const coursePlans = plans.filter((p) => p.courseId === courseId)
  const planScheduleNames = scheduleNames.filter((s) => s.planId === planId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error('Title is required.'); return }
    if (!planId) { toast.error('Plan is required.'); return }
    setBusy(true)
    try {
      const payload = {
        title,
        description: description || null,
        planId,
        courseId,
        scheduleNameId: scheduleNameId || null,
        fileKey: fileKey || null,
        isPublic,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
      }
      const url = isEdit ? `/api/admin/schedules/${initial!.id}` : '/api/admin/schedules'
      const method = isEdit ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success(isEdit ? 'Updated.' : 'Created.')
      onOpenChange(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit schedule' : 'Create schedule'}</DialogTitle>
          <DialogDescription>{isEdit ? initial!.title : 'Add a new schedule entry.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courseId">Course <span className="text-destructive">*</span></Label>
              <select
                id="courseId"
                value={courseId}
                onChange={(e) => { setCourseId(e.target.value); setPlanId(''); setScheduleNameId('') }}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
              >
                <option value="">Select course…</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="planId">Plan <span className="text-destructive">*</span></Label>
              <select
                id="planId"
                value={planId}
                onChange={(e) => { setPlanId(e.target.value); setScheduleNameId('') }}
                disabled={!courseId}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
              >
                <option value="">Select plan…</option>
                {coursePlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="scheduleNameId">Schedule name (optional)</Label>
              <select
                id="scheduleNameId"
                value={scheduleNameId}
                onChange={(e) => setScheduleNameId(e.target.value)}
                disabled={!planId}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
              >
                <option value="">No schedule name</option>
                {planScheduleNames.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>File</Label>
              <FileUpload
                keyPrefix="schedules"
                acceptExtensions={['pdf', 'doc', 'docx', 'xls', 'xlsx']}
                initial={fileKey ? { key: fileKey, name: fileName } : undefined}
                onUploaded={(r) => { setFileKey(r.key); setFileName(r.name) }}
                onClear={() => { setFileKey(''); setFileName('') }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="publishedAt">Published at</Label>
              <Input id="publishedAt" type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input
                id="isPublic"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="isPublic" className="cursor-pointer">Public (visible to all visitors)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isEdit ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ScheduleActions({
  courses,
  plans,
  scheduleNames,
  initial,
}: {
  courses: Course[]
  plans: Plan[]
  scheduleNames: ScheduleName[]
  initial: ScheduleListItem | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const isEdit = !!initial
  return (
    <>
      <Button size="sm" variant={isEdit ? 'outline' : 'default'} onClick={() => setOpen(true)} className="gap-1.5">
        {isEdit ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {isEdit ? 'Edit' : 'Create'}
      </Button>
      <ScheduleForm
        open={open}
        onOpenChange={setOpen}
        courses={courses}
        plans={plans}
        scheduleNames={scheduleNames}
        initial={initial}
      />
    </>
  )
}

export function ScheduleDelete({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      }
      title="Delete schedule?"
      description={<>Delete <strong>{title}</strong>?</>}
      confirmLabel="Delete"
      successMessage="Deleted."
      onConfirm={async () => {
        const r = await fetch(`/api/admin/schedules/${id}`, { method: 'DELETE' })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Failed.')
        router.refresh()
      }}
    />
  )
}

// --- Schedule names manager ---
export function ScheduleNamesManager({
  plans,
  initialNames,
}: {
  plans: Plan[]
  initialNames: ScheduleName[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [planId, setPlanId] = useState('')
  const [busy, setBusy] = useState(false)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !planId) {
      toast.error('Both plan and name are required.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/admin/schedule-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, planId }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success('Created.')
      setName(''); setPlanId('')
      setOpen(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    const r = await fetch(`/api/admin/schedule-names/${id}`, { method: 'DELETE' })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || 'Failed.')
    toast.success('Deleted.')
    router.refresh()
  }

  // Group schedule names by plan
  const byPlan = new Map<string, ScheduleName[]>()
  for (const sn of initialNames) {
    const arr = byPlan.get(sn.planId) ?? []
    arr.push(sn)
    byPlan.set(sn.planId, arr)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add schedule name
        </Button>
      </div>
      {initialNames.length === 0 ? (
        <p className="text-sm text-muted-foreground">No schedule names yet.</p>
      ) : (
        <div className="space-y-2">
          {Array.from(byPlan.entries()).map(([pid, sns]) => {
            const plan = plans.find((p) => p.id === pid)
            return (
              <div key={pid} className="rounded-md border">
                <div className="px-3 py-2 border-b bg-muted/40 font-medium text-sm">{plan?.name || pid}</div>
                <div className="divide-y">
                  {sns.map((sn) => (
                    <div key={sn.id} className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm">{sn.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive gap-1"
                        onClick={() => remove(sn.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add schedule name</DialogTitle>
            <DialogDescription>Schedule names belong to a specific plan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sn-plan">Plan</Label>
              <select
                id="sn-plan"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
              >
                <option value="">Select plan…</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sn-name">Name</Label>
              <Input id="sn-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. December 2025" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy} className="gap-1.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function toLocalInput(value: string): string {
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}
