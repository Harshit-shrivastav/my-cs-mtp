'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ContactLeadFormClient() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email && !mobile) {
      toast.error('Please provide either an email or a mobile number.')
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, mobile, message, source: 'CONTACT_PAGE' }),
      })
      if (r.ok) {
        toast.success('Thanks! We will get back to you within one working day.')
        setName('')
        setEmail('')
        setMobile('')
        setMessage('')
      } else {
        const err = await r.json().catch(() => ({}))
        toast.error(err.error || 'Could not submit. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="contact-mobile">Mobile</Label>
          <Input id="contact-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 …" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="contact-email">Email</Label>
        <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Tell us about your course interest, timeline or any specific question." />
      </div>
      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {submitting ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  )
}
