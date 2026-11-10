'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export interface PopupConfigData {
  enabled: boolean
  title: string
  text: string
  imageKey?: string | null
  delaySeconds: number
  frequency: string
}

export function LeadPopup({ popup }: { popup: PopupConfigData }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!popup.enabled) return
    const freq = popup.frequency || 'ONCE_PER_SESSION'
    const key = 'mtp_popup_seen_' + freq.toLowerCase()
    if (freq === 'ALWAYS') {
      // always show
    } else if (freq === 'ONCE_PER_DAY') {
      const seen = localStorage.getItem(key)
      if (seen) {
        const last = parseInt(seen, 10)
        if (Date.now() - last < 24 * 60 * 60 * 1000) return
      }
    } else {
      // ONCE_PER_SESSION
      const seen = sessionStorage.getItem(key)
      if (seen) return
    }
    const t = setTimeout(() => {
      setOpen(true)
      if (freq === 'ALWAYS') {
        // nothing to store
      } else if (freq === 'ONCE_PER_DAY') {
        localStorage.setItem(key, String(Date.now()))
      } else {
        sessionStorage.setItem(key, '1')
      }
    }, (popup.delaySeconds || 5) * 1000)
    return () => clearTimeout(t)
  }, [popup])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const r = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, mobile, source: 'POPUP' }),
      })
      if (r.ok) {
        toast.success('Thanks! We will contact you shortly.')
        setOpen(false)
      } else {
        const err = await r.json()
        toast.error(err.error || 'Could not submit')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!popup.enabled) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{popup.title || 'Special offer'}</DialogTitle>
          <DialogDescription>{popup.text}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="lead-name">Name</Label>
            <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lead-email">Email</Label>
            <Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lead-mobile">Mobile</Label>
            <Input id="lead-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <DialogClose asChild><Button type="button" variant="ghost">No thanks</Button></DialogClose>
            <Button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Get a callback'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
