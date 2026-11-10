'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { toast } from 'sonner'
import { Loader2, Send, Trash2, PowerOff, Power, Mail } from 'lucide-react'

// ------------------------------------------------------------------
// Subscriber row actions: activate/deactivate toggle + delete
// ------------------------------------------------------------------

export function SubscriberRowActions({ id, email, isActive }: { id: string; email: string; isActive: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/newsletter/subscribers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success(isActive ? 'Subscriber deactivated.' : 'Subscriber activated.')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button size="sm" variant="outline" onClick={toggle} disabled={busy} className="gap-1.5">
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isActive ? (
          <PowerOff className="h-3.5 w-3.5" />
        ) : (
          <Power className="h-3.5 w-3.5" />
        )}
        {isActive ? 'Deactivate' : 'Activate'}
      </Button>
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        }
        title="Delete subscriber?"
        description={<>Remove <strong>{email}</strong> from the newsletter list? This action cannot be undone.</>}
        confirmLabel="Delete"
        successMessage="Subscriber deleted."
        onConfirm={async () => {
          const r = await fetch(`/api/admin/newsletter/subscribers/${id}`, { method: 'DELETE' })
          const data = await r.json().catch(() => ({}))
          if (!r.ok) throw new Error(data.error || 'Failed.')
          router.refresh()
        }}
      />
    </div>
  )
}

// ------------------------------------------------------------------
// Shared subject/body fields
// ------------------------------------------------------------------

function SubjectBodyFields({
  subject,
  setSubject,
  body,
  setBody,
  idPrefix,
}: {
  subject: string
  setSubject: (v: string) => void
  body: string
  setBody: (v: string) => void
  idPrefix: string
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-subject`}>
          Subject <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-subject`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. New test series launched — CSEET"
          maxLength={200}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-body`}>
          Body <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id={`${idPrefix}-body`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Plain-text message. Blank lines become paragraph breaks in the email."
          rows={8}
        />
        <p className="text-xs text-muted-foreground">
          Plain text — sent as a formatted email with paragraph breaks preserved.
        </p>
      </div>
    </div>
  )
}

function announceResult(
  successCount: number,
  failureCount: number,
  total: number,
  noun: string
) {
  if (successCount === 0) {
    toast.error(`Send failed for all ${total} ${noun}. Check SMTP settings in the server logs.`)
  } else if (failureCount > 0) {
    toast.warning(`Sent to ${successCount} of ${total} ${noun} — ${failureCount} failed.`)
  } else {
    toast.success(`Sent to ${successCount} ${noun}.`)
  }
}

async function postSend(payload: {
  subject: string
  body: string
  audience: 'SUBSCRIBERS' | 'ALL_STUDENTS' | 'COURSE'
  courseId?: string | null
}) {
  const r = await fetch('/api/admin/newsletter/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || 'Failed to send.')
  return data as { successCount: number; failureCount: number; total: number }
}

// ------------------------------------------------------------------
// Compose & send to active newsletter subscribers
// ------------------------------------------------------------------

export function NewsletterComposeForm({ activeSubscriberCount }: { activeSubscriberCount: number }) {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const valid = subject.trim().length > 0 && body.trim().length > 0

  return (
    <div className="space-y-4">
      <SubjectBodyFields idPrefix="newsletter" subject={subject} setSubject={setSubject} body={body} setBody={setBody} />
      <ConfirmDialog
        trigger={
          <Button disabled={!valid} className="gap-1.5">
            <Send className="h-4 w-4" />
            Send to active subscribers
          </Button>
        }
        title="Send newsletter?"
        destructive={false}
        description={
          <>
            This emails <strong>{activeSubscriberCount}</strong> active{' '}
            {activeSubscriberCount === 1 ? 'subscriber' : 'subscribers'} with the subject{' '}
            <strong>{subject.trim() || '(untitled)'}</strong>. Sending runs immediately and is
            recorded in the send log.
          </>
        }
        confirmLabel="Send now"
        onConfirm={async () => {
          setBusy(true)
          try {
            const res = await postSend({ subject: subject.trim(), body: body.trim(), audience: 'SUBSCRIBERS' })
            announceResult(res.successCount, res.failureCount, res.total, 'subscribers')
            setSubject('')
            setBody('')
            router.refresh()
          } finally {
            setBusy(false)
          }
        }}
      />
      {busy && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending — one email per subscriber, this can take a few seconds…
        </p>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Broadcast to students (ALL or by course)
// ------------------------------------------------------------------

export function BroadcastForm({
  courses,
  allStudentsCount,
  courseCounts,
}: {
  courses: { id: string; name: string }[]
  allStudentsCount: number
  courseCounts: Record<string, number>
}) {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<'ALL_STUDENTS' | 'COURSE'>('ALL_STUDENTS')
  const [courseId, setCourseId] = useState('')
  const [busy, setBusy] = useState(false)

  const valid = subject.trim().length > 0 && body.trim().length > 0 && (audience === 'ALL_STUDENTS' || !!courseId)
  const recipientCount =
    audience === 'ALL_STUDENTS' ? allStudentsCount : courseId ? courseCounts[courseId] ?? 0 : 0

  return (
    <div className="space-y-4">
      <SubjectBodyFields idPrefix="broadcast" subject={subject} setSubject={setSubject} body={body} setBody={setBody} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="broadcast-audience">Audience</Label>
          <select
            id="broadcast-audience"
            value={audience}
            onChange={(e) => {
              setAudience(e.target.value as 'ALL_STUDENTS' | 'COURSE')
              setCourseId('')
            }}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
          >
            <option value="ALL_STUDENTS">All students</option>
            <option value="COURSE">By course</option>
          </select>
        </div>
        {audience === 'COURSE' && (
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-course">
              Course <span className="text-destructive">*</span>
            </Label>
            <select
              id="broadcast-course"
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
      </div>
      <ConfirmDialog
        trigger={
          <Button disabled={!valid} className="gap-1.5">
            <Mail className="h-4 w-4" />
            Send broadcast
          </Button>
        }
        title="Send broadcast?"
        destructive={false}
        description={
          <>
            This emails <strong>{recipientCount}</strong> matching active, non-blocked{' '}
            {recipientCount === 1 ? 'student' : 'students'} with the subject{' '}
            <strong>{subject.trim() || '(untitled)'}</strong>. Sending runs immediately and is
            recorded in the send log.
          </>
        }
        confirmLabel="Send now"
        onConfirm={async () => {
          setBusy(true)
          try {
            const res = await postSend({
              subject: subject.trim(),
              body: body.trim(),
              audience,
              courseId: audience === 'COURSE' ? courseId : null,
            })
            announceResult(res.successCount, res.failureCount, res.total, 'students')
            setSubject('')
            setBody('')
            setCourseId('')
            router.refresh()
          } finally {
            setBusy(false)
          }
        }}
      />
      {busy && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending — one email per student, this can take a few seconds…
        </p>
      )}
    </div>
  )
}
