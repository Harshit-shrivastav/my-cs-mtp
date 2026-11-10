'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, CalendarClock } from 'lucide-react'

export default function MentorshipRequestForm() {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (topic.trim().length < 3) {
      toast.error('Topic must be at least 3 characters.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/student/mentorship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), preferredDate: preferredDate || undefined, notes: notes.trim() || undefined }),
      })
      const data = await r.json()
      if (!r.ok) {
        toast.error(data.error || 'Could not submit request.')
        return
      }
      toast.success('Mentorship request submitted. We will be in touch shortly.')
      setTopic('')
      setPreferredDate('')
      setNotes('')
      router.refresh()
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="topic">Topic <span className="text-destructive">*</span></Label>
        <Input
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Strategy for Company Law revision"
          maxLength={200}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="preferredDate">Preferred date (optional)</Label>
        <Input
          id="preferredDate"
          type="date"
          value={preferredDate}
          onChange={(e) => setPreferredDate(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Briefly describe what you want to discuss."
          rows={4}
          maxLength={2000}
        />
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarClock className="h-4 w-4 mr-2" />}
        Submit request
      </Button>
    </form>
  )
}
