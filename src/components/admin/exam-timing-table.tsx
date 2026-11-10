'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { toast } from 'sonner'
import { Clock, Loader2, Pencil, Plus, Trash2, EyeOff } from 'lucide-react'

export interface ExamTimingRow {
  id: string
  examName: string
  courseKey: string
  courseId: string | null
  courseName: string | null
  examDateIso: string
  examDateLabel: string
  isVisible: boolean
  daysRemaining: number
  past: boolean
}

export interface ExamTimingTableProps {
  rows: ExamTimingRow[]
  courses: { id: string; name: string; isActive: boolean }[]
}

const COURSE_KEYS = [
  { value: 'CSEET', label: 'CSEET' },
  { value: 'CS_EXECUTIVE', label: 'CS Executive' },
  { value: 'CS_PROFESSIONAL', label: 'CS Professional' },
  { value: 'CUSTOM', label: 'Custom' },
]

function courseKeyLabel(k: string): string {
  return COURSE_KEYS.find((c) => c.value === k)?.label || k
}

interface FormState {
  examName: string
  courseKey: string
  courseId: string
  examDate: string // datetime-local value
  isVisible: boolean
}

function emptyForm(): FormState {
  return { examName: '', courseKey: 'CSEET', courseId: '', examDate: '', isVisible: true }
}

function toLocalInput(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

export function ExamTimingTable({ rows, courses }: ExamTimingTableProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ExamTimingRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [busy, setBusy] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setOpen(true)
  }

  function openEdit(row: ExamTimingRow) {
    setEditing(row)
    setForm({
      examName: row.examName,
      courseKey: row.courseKey,
      courseId: row.courseId || '',
      examDate: toLocalInput(row.examDateIso),
      isVisible: row.isVisible,
    })
    setOpen(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.examName.trim()) {
      toast.error('Exam name is required.')
      return
    }
    if (!form.examDate) {
      toast.error('Exam date & time are required.')
      return
    }
    const iso = new Date(form.examDate).toISOString()
    setBusy(true)
    try {
      const url = editing ? `/api/admin/exam-timing/${editing.id}` : '/api/admin/exam-timing'
      const r = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examName: form.examName.trim(),
          courseKey: form.courseKey,
          courseId: form.courseId || null,
          examDate: iso,
          isVisible: form.isVisible,
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed to save exam timing.')
      toast.success(editing ? 'Exam timing updated.' : 'Exam timing created.')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save exam timing.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleVisible(row: ExamTimingRow, visible: boolean) {
    setTogglingId(row.id)
    try {
      const r = await fetch(`/api/admin/exam-timing/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: visible }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed to update visibility.')
      toast.success(visible ? 'Countdown is now visible.' : 'Countdown hidden.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update visibility.')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Exam countdowns</CardTitle>
        <CardDescription>{rows.length} row(s) — ordered by exam date.</CardDescription>
        <div className="mt-2">
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add exam timing
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">No exam timings yet.</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add one to show a live countdown on the homepage and student dashboards.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam</TableHead>
                <TableHead>Course key</TableHead>
                <TableHead>Linked course</TableHead>
                <TableHead>Exam date</TableHead>
                <TableHead>Countdown</TableHead>
                <TableHead>Visible</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.examName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{courseKeyLabel(row.courseKey)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.courseName || <span className="text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">{row.examDateLabel}</TableCell>
                  <TableCell>
                    {row.past ? (
                      <Badge variant="secondary">Passed</Badge>
                    ) : (
                      <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                        {row.daysRemaining} day{row.daysRemaining === 1 ? '' : 's'} left
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row.isVisible}
                        disabled={togglingId === row.id}
                        onCheckedChange={(v) => toggleVisible(row, v)}
                        aria-label={`Toggle visibility for ${row.examName}`}
                      />
                      {togglingId === row.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      {!row.isVisible && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <EyeOff className="h-3 w-3" />
                          Hidden
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(row)}
                        className="gap-1.5"
                        aria-label={`Edit ${row.examName}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            aria-label={`Delete ${row.examName}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        }
                        title="Delete exam timing?"
                        description={`This permanently removes the "${row.examName}" countdown. Students will no longer see it on their dashboard.`}
                        confirmLabel="Delete"
                        onConfirm={async () => {
                          const r = await fetch(`/api/admin/exam-timing/${row.id}`, { method: 'DELETE' })
                          const data = await r.json().catch(() => ({}))
                          if (!r.ok) throw new Error(data.error || 'Failed to delete.')
                          toast.success('Exam timing deleted.')
                          router.refresh()
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit exam timing' : 'Add exam timing'}</DialogTitle>
            <DialogDescription>
              The exam date powers a live countdown. Link a course to show it on that course&apos;s
              students&apos; dashboards and the homepage countdown (one countdown per course).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="exam-name">
                Exam name<span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="exam-name"
                value={form.examName}
                onChange={(e) => setForm({ ...form, examName: e.target.value })}
                placeholder="e.g. CSEET July 2026 Session"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="course-key">Course key</Label>
                <Select value={form.courseKey} onValueChange={(v) => setForm({ ...form, courseKey: v })}>
                  <SelectTrigger id="course-key" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_KEYS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-link">Linked course (optional)</Label>
                <Select
                  value={form.courseId}
                  onValueChange={(v) => setForm({ ...form, courseId: v })}
                >
                  <SelectTrigger id="course-link" className="w-full">
                    <SelectValue placeholder="Not linked" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not linked</SelectItem>
                    {courses.map((c) => {
                      const takenBy = rows.find((r) => r.courseId === c.id && r.id !== editing?.id)
                      return (
                        <SelectItem key={c.id} value={c.id} disabled={!!takenBy}>
                          {c.name}
                          {takenBy ? ' (already has a countdown)' : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-date">
                Exam date &amp; time<span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="exam-date"
                type="datetime-local"
                value={form.examDate}
                onChange={(e) => setForm({ ...form, examDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-visible">Visible</Label>
              <div className="flex items-center gap-3">
                <Switch
                  id="exam-visible"
                  checked={form.isVisible}
                  onCheckedChange={(v) => setForm({ ...form, isVisible: v })}
                />
                <span className="text-xs text-muted-foreground">
                  {form.isVisible ? 'Shown publicly' : 'Hidden'}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy} className="gap-1.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing ? 'Save changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
