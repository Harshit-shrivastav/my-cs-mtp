'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ShieldOff, LogIn, Ban } from 'lucide-react'

interface PurchaseRow {
  id: string
  isRevoked: boolean
  planId: string
  plan: { id: string; name: string }
  subject: { id: string; name: string }
  price: number
  createdAt: string
}

/** Poll a tracked job until it finishes; return its result. */
async function pollJob(jobId: string): Promise<{ status: string; result: { revokedCount?: number } | null }> {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`/api/admin/jobs/${jobId}`)
    if (r.ok) {
      const data = await r.json()
      if (data.status === 'COMPLETED' || data.status === 'FAILED') return data
    }
    await new Promise((res) => setTimeout(res, 500))
  }
  throw new Error('Job did not finish in time. Check Admin job status later.')
}

/** Destructive revoke action: asks the admin to re-enter their own password,
 *  then runs the server-side password-confirmed tracked job and polls it. */
function RevokeWithPassword({
  trigger,
  title,
  description,
  confirmLabel,
  buildBody,
  endpoint,
  successPrefix,
}: {
  trigger: React.ReactNode
  title: string
  description: string
  confirmLabel: string
  buildBody: (adminPassword: string) => Record<string, unknown>
  endpoint: string
  successPrefix: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState('')

  async function handleConfirm() {
    if (!password) return
    setBusy(true)
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(password)),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      const job = await pollJob(data.jobId)
      if (job.status === 'FAILED') throw new Error('Revoke job failed. Please try again.')
      toast.success(`${successPrefix} ${job.result?.revokedCount ?? 0} purchase(s).`)
      setOpen(false)
      setPassword('')
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setPassword('')
          setBusy(false)
        }
        setOpen(v)
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>{description}</div>
              <div>
                <p className="text-xs">
                  Enter <span className="font-semibold">your admin password</span> to confirm this action.
                </p>
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && password && !busy) void handleConfirm()
                  }}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Admin password"
                  autoComplete="current-password"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              void handleConfirm()
            }}
            disabled={busy || !password}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function StudentPurchases({ studentId, purchases }: { studentId: string; purchases: PurchaseRow[] }) {
  const [busyId, setBusyId] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <RevokeWithPassword
          trigger={
            <Button size="sm" variant="destructive" className="gap-1.5">
              <Ban className="h-3.5 w-3.5" />
              Revoke all purchases
            </Button>
          }
          title="Revoke all purchases for this student?"
          description="This will mark every active purchase for this student as revoked. The student will lose access to all their test papers, notes, and assignments immediately."
          confirmLabel="Revoke all"
          endpoint={`/api/admin/students/${studentId}/revoke-all-purchases`}
          buildBody={(adminPassword) => ({ adminPassword })}
          successPrefix="Revoked"
        />
      </div>
      {purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground">No purchases yet.</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Plan</th>
                <th className="text-left px-3 py-2 font-medium">Subject</th>
                <th className="text-right px-3 py-2 font-medium">Price</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-right px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.plan.name}</td>
                  <td className="px-3 py-2">{p.subject.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">₹{p.price.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    {p.isRevoked ? (
                      <Badge variant="destructive">Revoked</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!p.isRevoked && (
                      <RevokeWithPassword
                        trigger={
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === p.id}
                            className="gap-1.5 text-destructive hover:text-destructive"
                          >
                            <ShieldOff className="h-3.5 w-3.5" />
                            Revoke
                          </Button>
                        }
                        title="Revoke this purchase?"
                        description={`This revokes every purchase of plan "${p.plan.name}" for this student. The student will immediately lose access to its papers and notes.`}
                        confirmLabel="Revoke"
                        endpoint={`/api/admin/students/${studentId}/revoke-purchases`}
                        buildBody={(adminPassword) => ({ planId: p.planId, adminPassword })}
                        successPrefix="Revoked"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Global destructive action on the Students list page: revoke every active
 *  purchase for ALL students. Password-confirmed + tracked job + polling. */
export function GlobalRevokeAllButton() {
  return (
    <RevokeWithPassword
      trigger={
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
          <Ban className="h-3.5 w-3.5" />
          Revoke all purchases (all students)
        </Button>
      }
      title="Revoke ALL purchases for ALL students?"
      description="This marks every active purchase in the entire platform as revoked. Every student immediately loses access to their purchased papers and notes. Use only in an emergency (e.g. data breach or mass refund)."
      confirmLabel="Revoke everything"
      endpoint="/api/admin/purchases/revoke-all"
      buildBody={(adminPassword) => ({ adminPassword })}
      successPrefix="Revoked"
    />
  )
}

export function ImpersonateButton({ studentId }: { studentId: string }) {
  const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/students/${studentId}/impersonate`, { method: 'POST' })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      // The API set the auth cookie — now navigate to the dashboard.
      window.location.href = data.redirect || '/dashboard'
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
      setBusy(false)
    }
  }
  return (
    <Button onClick={go} disabled={busy} size="sm" variant="outline" className="gap-1.5">
      <LogIn className="h-3.5 w-3.5" />
      {busy ? 'Switching…' : 'Login as student'}
    </Button>
  )
}

export function StudentProfileActions({ studentId }: { studentId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ImpersonateButton studentId={studentId} />
      <Button asChild size="sm" variant="outline">
        <Link href="/admin/students">Back to list</Link>
      </Button>
    </div>
  )
}
