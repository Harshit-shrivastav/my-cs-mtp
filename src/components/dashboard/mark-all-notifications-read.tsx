'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CheckCheck, Loader2 } from 'lucide-react'

/** Marks every unread in-app notification of the current student as read. */
export function MarkAllNotificationsRead({ unreadCount }: { unreadCount: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (unreadCount <= 0) return null

  async function markRead() {
    setBusy(true)
    try {
      const r = await fetch('/api/student/notifications/read', { method: 'POST' })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success(`Marked ${data.updatedCount} ${data.updatedCount === 1 ? 'notification' : 'notifications'} as read.`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={markRead} disabled={busy} className="gap-1.5">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
      Mark all read
    </Button>
  )
}
