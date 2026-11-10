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
import { Switch } from '@/components/ui/switch'
import { FileUpload } from '@/components/admin/file-upload'
import { toast } from 'sonner'
import { Loader2, Save, Plus, Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'

interface Course { id: string; name: string }
interface Plan { id: string; name: string; courseId: string }
interface Subject { id: string; name: string; courseId: string }
interface PlanSubjectLink { planId: string; subjectId: string }

interface PaperListItem {
  id: string
  title: string
  slug: string
  courseId: string
  planId: string
  subjectId: string
  description: string | null
  questionFileKey: string | null
  answerFileKey: string | null
  allowAnswerDownload: boolean
  scheduledDate: string | null
  totalMarks: number
  isActive: boolean
  sortOrder: number
}

interface PapersFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  courses: Course[]
  plans: Plan[]
  subjects: Subject[]
  planSubjectLinks: PlanSubjectLink[]
  initial?: PaperListItem | null
  onSuccess?: () => void
}

export function PapersForm({
  open,
  onOpenChange,
  courses,
  plans,
  subjects,
  planSubjectLinks,
  initial,
  onSuccess,
}: PapersFormProps) {
  const router = useRouter()
  const isEdit = !!initial

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [courseId, setCourseId] = useState('')
  const [planId, setPlanId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [description, setDescription] = useState('')
  const [questionKey, setQuestionKey] = useState('')
  const [questionName, setQuestionName] = useState('')
  const [answerKey, setAnswerKey] = useState('')
  const [answerName, setAnswerName] = useState('')
  const [allowAnswerDownload, setAllowAnswerDownload] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [totalMarks, setTotalMarks] = useState('100')
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState('0')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setTitle(initial.title || '')
      setSlug(initial.slug || '')
      setCourseId(initial.courseId || '')
      setPlanId(initial.planId || '')
      setSubjectId(initial.subjectId || '')
      setDescription(initial.description || '')
      setQuestionKey(initial.questionFileKey || '')
      setQuestionName(initial.questionFileKey ? initial.questionFileKey.split('/').pop() || '' : '')
      setAnswerKey(initial.answerFileKey || '')
      setAnswerName(initial.answerFileKey ? initial.answerFileKey.split('/').pop() || '' : '')
      setAllowAnswerDownload(initial.allowAnswerDownload)
      setScheduledDate(initial.scheduledDate ? toLocalInput(initial.scheduledDate) : '')
      setTotalMarks(String(initial.totalMarks ?? 100))
      setIsActive(initial.isActive)
      setSortOrder(String(initial.sortOrder ?? 0))
    } else {
      setTitle(''); setSlug(''); setCourseId(''); setPlanId(''); setSubjectId('')
      setDescription(''); setQuestionKey(''); setQuestionName(''); setAnswerKey(''); setAnswerName('')
      setAllowAnswerDownload(false); setScheduledDate(''); setTotalMarks('100'); setIsActive(true); setSortOrder('0')
    }
  }, [open, initial])

  // When title changes & not editing, auto-slug
  function onTitleChange(v: string) {
    setTitle(v)
    if (!isEdit) setSlug(slugify(v))
  }

  // When course changes, reset plan + subject
  function onCourseChange(v: string) {
    setCourseId(v)
    setPlanId('')
    setSubjectId('')
  }

  // Plans for selected course
  const coursePlans = plans.filter((p) => p.courseId === courseId)
  // Subjects available for selected course + plan (intersect plan-subject links)
  const courseSubjects = subjects.filter((s) => s.courseId === courseId)
  const planSubjects = planId
    ? courseSubjects.filter((s) => planSubjectLinks.some((l) => l.planId === planId && l.subjectId === s.id))
    : courseSubjects

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error('Title is required.'); return }
    if (!slug.trim()) { toast.error('Slug is required.'); return }
    if (!courseId) { toast.error('Course is required.'); return }
    if (!planId) { toast.error('Plan is required.'); return }
    if (!subjectId) { toast.error('Subject is required.'); return }

    // Validate the plan-subject combo exists
    const linkOk = planSubjectLinks.some((l) => l.planId === planId && l.subjectId === subjectId)
    if (!linkOk) {
      toast.error('Selected subject is not part of the selected plan.')
      return
    }

    setBusy(true)
    try {
      const payload = {
        title,
        slug,
        courseId,
        planId,
        subjectId,
        description: description || null,
        questionFileKey: questionKey || null,
        answerFileKey: answerKey || null,
        allowAnswerDownload,
        scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : null,
        totalMarks: Number(totalMarks) || 100,
        isActive,
        sortOrder: Number(sortOrder) || 0,
      }
      const url = isEdit ? `/api/admin/papers/${initial!.id}` : '/api/admin/papers'
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
      if (onSuccess) onSuccess()
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
          <DialogTitle>{isEdit ? 'Edit paper' : 'Create paper'}</DialogTitle>
          <DialogDescription>{isEdit ? initial!.title : 'Add a new test paper.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input id="title" value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="e.g. Business Communication Mock 1" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="slug">Slug <span className="text-destructive">*</span></Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courseId">Course <span className="text-destructive">*</span></Label>
              <select
                id="courseId"
                value={courseId}
                onChange={(e) => onCourseChange(e.target.value)}
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
                onChange={(e) => { setPlanId(e.target.value); setSubjectId('') }}
                disabled={!courseId}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
              >
                <option value="">Select plan…</option>
                {coursePlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subjectId">Subject <span className="text-destructive">*</span></Label>
              <select
                id="subjectId"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={!planId}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
              >
                <option value="">Select subject…</option>
                {planSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalMarks">Total marks</Label>
              <Input id="totalMarks" type="number" min="0" step="0.5" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheduledDate">Scheduled date</Label>
              <Input id="scheduledDate" type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sortOrder">Sort order</Label>
              <Input id="sortOrder" type="number" min="0" step="1" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Question paper file</Label>
              <FileUpload
                keyPrefix="papers"
                acceptExtensions={['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']}
                initial={questionKey ? { key: questionKey, name: questionName } : undefined}
                onUploaded={(r) => { setQuestionKey(r.key); setQuestionName(r.name) }}
                onClear={() => { setQuestionKey(''); setQuestionName('') }}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Answer / solution file</Label>
              <FileUpload
                keyPrefix="papers/answers"
                acceptExtensions={['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']}
                initial={answerKey ? { key: answerKey, name: answerName } : undefined}
                onUploaded={(r) => { setAnswerKey(r.key); setAnswerName(r.name) }}
                onClear={() => { setAnswerKey(''); setAnswerName('') }}
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2 pt-1">
              <Switch id="allowAnswerDownload" checked={allowAnswerDownload} onCheckedChange={setAllowAnswerDownload} />
              <Label htmlFor="allowAnswerDownload" className="cursor-pointer">Allow students to download the answer file</Label>
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
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

export function PapersActions({
  courses,
  plans,
  subjects,
  planSubjectLinks,
  initial,
}: {
  courses: Course[]
  plans: Plan[]
  subjects: Subject[]
  planSubjectLinks: PlanSubjectLink[]
  initial?: PaperListItem | null
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
      <PapersForm
        open={open}
        onOpenChange={setOpen}
        courses={courses}
        plans={plans}
        subjects={subjects}
        planSubjectLinks={planSubjectLinks}
        initial={initial}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}

export function PapersDelete({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      }
      title="Delete paper?"
      description={<>Delete <strong>{title}</strong>? This will also delete related assignments.</>}
      confirmLabel="Delete"
      successMessage="Deleted."
      onConfirm={async () => {
        const r = await fetch(`/api/admin/papers/${id}`, { method: 'DELETE' })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Failed.')
        router.refresh()
      }}
    />
  )
}

function slugify(s: string): string {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
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
