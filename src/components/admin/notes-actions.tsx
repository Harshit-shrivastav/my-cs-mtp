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
interface Subject { id: string; name: string; courseId: string }

interface NoteListItem {
  id: string
  title: string
  description: string | null
  courseId: string
  planId: string | null
  subjectId: string | null
  fileKey: string | null
  isActive: boolean
}

interface NoteFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  courses: Course[]
  plans: Plan[]
  subjects: Subject[]
  initial?: NoteListItem | null
  endpoint: string
  title: string
  description: string
  keyPrefix: string
  onSuccess?: () => void
}

export function NoteLikeForm({
  open,
  onOpenChange,
  courses,
  plans,
  subjects,
  initial,
  endpoint,
  title,
  description,
  keyPrefix,
}: NoteFormProps) {
  const router = useRouter()
  const isEdit = !!initial

  const [t, setT] = useState('')
  const [desc, setDesc] = useState('')
  const [courseId, setCourseId] = useState('')
  const [planId, setPlanId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [fileKey, setFileKey] = useState('')
  const [fileName, setFileName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setT(initial.title)
      setDesc(initial.description || '')
      setCourseId(initial.courseId)
      setPlanId(initial.planId || '')
      setSubjectId(initial.subjectId || '')
      setFileKey(initial.fileKey || '')
      setFileName(initial.fileKey ? initial.fileKey.split('/').pop() || '' : '')
      setIsActive(initial.isActive)
    } else {
      setT(''); setDesc(''); setCourseId(''); setPlanId(''); setSubjectId(''); setFileKey(''); setFileName(''); setIsActive(true)
    }
  }, [open, initial])

  const coursePlans = plans.filter((p) => p.courseId === courseId)
  const courseSubjects = subjects.filter((s) => s.courseId === courseId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!t.trim()) { toast.error('Title is required.'); return }
    if (!courseId) { toast.error('Course is required.'); return }
    setBusy(true)
    try {
      const payload = {
        title: t,
        description: desc || null,
        courseId,
        planId: planId || null,
        subjectId: subjectId || null,
        fileKey: fileKey || null,
        isActive,
      }
      const url = isEdit ? `${endpoint}/${initial!.id}` : endpoint
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
          <DialogTitle>{isEdit ? `Edit ${title.toLowerCase()}` : `Create ${title.toLowerCase()}`}</DialogTitle>
          <DialogDescription>{isEdit ? initial!.title : description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input id="title" value={t} onChange={(e) => setT(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courseId">Course <span className="text-destructive">*</span></Label>
              <select
                id="courseId"
                value={courseId}
                onChange={(e) => { setCourseId(e.target.value); setPlanId(''); setSubjectId('') }}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
              >
                <option value="">Select course…</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="planId">Plan (optional)</Label>
              <select
                id="planId"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                disabled={!courseId}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
              >
                <option value="">Any plan</option>
                {coursePlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subjectId">Subject (optional)</Label>
              <select
                id="subjectId"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={!courseId}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
              >
                <option value="">Any subject</option>
                {courseSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>File</Label>
              <FileUpload
                keyPrefix={keyPrefix}
                acceptExtensions={['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']}
                initial={fileKey ? { key: fileKey, name: fileName } : undefined}
                onUploaded={(r) => { setFileKey(r.key); setFileName(r.name) }}
                onClear={() => { setFileKey(''); setFileName('') }}
              />
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

export function NoteLikeActions({
  courses,
  plans,
  subjects,
  initial,
  endpoint,
  title,
  description,
  keyPrefix,
}: {
  courses: Course[]
  plans: Plan[]
  subjects: Subject[]
  initial: NoteListItem | null
  endpoint: string
  title: string
  description: string
  keyPrefix: string
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
      <NoteLikeForm
        open={open}
        onOpenChange={setOpen}
        courses={courses}
        plans={plans}
        subjects={subjects}
        initial={initial}
        endpoint={endpoint}
        title={title}
        description={description}
        keyPrefix={keyPrefix}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}

export function NoteLikeDelete({
  id,
  title,
  endpoint,
}: {
  id: string
  title: string
  endpoint: string
}) {
  const router = useRouter()
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      }
      title="Delete?"
      description={<>Delete <strong>{title}</strong>?</>}
      confirmLabel="Delete"
      successMessage="Deleted."
      onConfirm={async () => {
        const r = await fetch(`${endpoint}/${id}`, { method: 'DELETE' })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Failed.')
        router.refresh()
      }}
    />
  )
}
