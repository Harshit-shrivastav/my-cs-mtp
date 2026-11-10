'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { toast } from 'sonner'
import { Loader2, Bell, Trash2, Send } from 'lucide-react'

export interface StudentOption {
  id: string
  name: string | null
  email: string
}

/** Create + send an in-app notification to ALL / COURSE / SINGLE student. */
export function CreateNotificationDialog({
  courses,
  students,
  allStudentsCount,
  courseCounts,
}: {
  courses: { id: string; name: string }[]
  students: StudentOption[]
  allStudentsCount: number
  courseCounts: Record<string, number>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState<'ALL' | 'COURSE' | 'SINGLE'>('ALL')
  const [courseId, setCourseId] = useState('')
  const [targetUserId, setTargetUserId] = useState('')

  const formValid =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    (audience === 'ALL' || (audience === 'COURSE' && !!courseId) || (audience === 'SINGLE' && !!targetUserId))

  const recipientCount =
    audience === 'ALL'
      ? allStudentsCount
      : audience === 'COURSE'
        ? courseId
          ? courseCounts[courseId] ?? 0
          : 0
        : 1

  function reset() {
    setTitle('')
    setMessage('')
    setAudience('ALL')
    setCourseId('')
    setTargetUserId('')
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formValid) {
      toast.error('Fill in the required fields for the chosen audience.')
      return
    }
    setConfirmOpen(true)
  }

  async function send() {
    setBusy(true)
    try {
      const r = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          audience,
          courseId: audience === 'COURSE' ? courseId : null,
          targetUserId: audience === 'SINGLE' ? targetUserId : null,
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed to send.')
      toast.success(`Sent to ${data.recipientCount} ${data.recipientCount === 1 ? 'student' : 'students'}.`)
      setConfirmOpen(false)
      setOpen(false)
      reset()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Bell className="h-3.5 w-3.5" />
        New notification
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v) }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send notification</DialogTitle>
            <DialogDescription>
              Creates an in-app notification and fans it out to the chosen audience.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="notif-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="notif-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New mock test published"
                maxLength={150}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notif-message">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="notif-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What should students see?"
                rows={5}
                maxLength={5000}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="notif-audience">Audience</Label>
                <select
                  id="notif-audience"
                  value={audience}
                  onChange={(e) => {
                    setAudience(e.target.value as 'ALL' | 'COURSE' | 'SINGLE')
                    setCourseId('')
                    setTargetUserId('')
                  }}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
                >
                  <option value="ALL">All students</option>
                  <option value="COURSE">By course</option>
                  <option value="SINGLE">Single student</option>
                </select>
              </div>
              {audience === 'COURSE' && (
                <div className="space-y-1.5">
                  <Label htmlFor="notif-course">
                    Course <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="notif-course"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
                  >
                    <option value="">Select a course…</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {audience === 'SINGLE' && (
                <div className="space-y-1.5">
                  <Label htmlFor="notif-student">
                    Student <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="notif-student"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
                  >
                    <option value="">Select a student…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.email.split('@')[0]} — {s.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy} className="gap-1.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Next: confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation before fan-out */}
      <AlertDialog open={confirmOpen} onOpenChange={(v) => { if (!busy) setConfirmOpen(v) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send notification?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                This creates an in-app notification for{' '}
                <strong>{recipientCount}</strong> {recipientCount === 1 ? 'student' : 'students'} with
                the title <strong>{title.trim() || '(untitled)'}</strong>. Recipients will see it on
                their dashboard immediately.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void send()
              }}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/** Delete a sent notification (recipients cascade). */
export function DeleteNotificationButton({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      }
      title="Delete notification?"
      description={<>Delete <strong>{title}</strong>? It will disappear from every recipient&apos;s dashboard. This action cannot be undone.</>}
      confirmLabel="Delete"
      successMessage="Notification deleted."
      onConfirm={async () => {
        const r = await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Failed.')
        router.refresh()
      }}
    />
  )
}
