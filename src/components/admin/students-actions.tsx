'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { toast } from 'sonner'
import { ShieldOff, ShieldCheck, Trash2, Loader2 } from 'lucide-react'

interface StudentsTableActionsProps {
  user: { id: string; isBlocked: boolean; name: string | null; email: string }
}

export function StudentsTableActions({ user }: StudentsTableActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggleBlock() {
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/students/${user.id}/block`, { method: 'POST' })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success(user.isBlocked ? 'Student unblocked.' : 'Student blocked.')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={toggleBlock}
        disabled={busy}
        className="gap-1.5"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : user.isBlocked ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
        {user.isBlocked ? 'Unblock' : 'Block'}
      </Button>
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        }
        title="Delete student?"
        description={<>This will permanently delete <strong>{user.name || user.email}</strong> and all related data (orders, purchases, assignments, wallet, cart). This action cannot be undone.</>}
        confirmLabel="Delete"
        successMessage="Student deleted."
        onConfirm={async () => {
          const r = await fetch(`/api/admin/students/${user.id}`, { method: 'DELETE' })
          const data = await r.json().catch(() => ({}))
          if (!r.ok) throw new Error(data.error || 'Failed.')
          router.refresh()
        }}
      />
    </div>
  )
}
