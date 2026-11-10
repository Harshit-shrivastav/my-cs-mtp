'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { toast } from 'sonner'
import { Loader2, Minus, Plus, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils-extra'

type AdjustMode = 'CREDIT' | 'DEBIT'

interface WalletAdjustButtonProps {
  /** Wallet row id — may be null when the student has no wallet yet. */
  walletId: string | null
  /** Required to lazily create the wallet when walletId is null. */
  userId?: string
  studentName: string
  mode: AdjustMode
  label?: string
}

/** Opens a dialog to credit/debit a wallet. Creates the wallet row on demand if missing. */
export function WalletAdjustButton({ walletId, userId, studentName, mode, label }: WalletAdjustButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [activeWalletId, setActiveWalletId] = useState<string | null>(walletId)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [preparing, setPreparing] = useState(false)

  async function handleOpen() {
    if (activeWalletId) {
      setOpen(true)
      return
    }
    if (!userId) {
      toast.error('No wallet found for this student.')
      return
    }
    setPreparing(true)
    try {
      const r = await fetch('/api/admin/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed to create wallet.')
      setActiveWalletId(data.wallet.id as string)
      setOpen(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create wallet.')
    } finally {
      setPreparing(false)
    }
  }

  async function submit() {
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Amount must be greater than 0.')
      return
    }
    if (!reason.trim()) {
      toast.error('Reason is required.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/wallet/${activeWalletId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mode,
          amount: amt,
          reason: reason.trim(),
          reference: reference.trim() || undefined,
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success(
        `${mode === 'CREDIT' ? 'Credited' : 'Debited'} ${formatCurrency(amt)} — new balance ${formatCurrency(data.balance as number)}.`
      )
      setOpen(false)
      setAmount('')
      setReason('')
      setReference('')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleOpen}
        disabled={preparing}
        className="gap-1.5"
      >
        {preparing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : mode === 'CREDIT' ? (
          <Plus className="h-3.5 w-3.5" />
        ) : (
          <Minus className="h-3.5 w-3.5" />
        )}
        {label || (mode === 'CREDIT' ? 'Credit' : 'Debit')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === 'CREDIT' ? 'Credit wallet' : 'Debit wallet'}</DialogTitle>
            <DialogDescription>{studentName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`adjust-amount-${mode}`}>
                Amount (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`adjust-amount-${mode}`}
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`adjust-reason-${mode}`}>
                Reason <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`adjust-reason-${mode}`}
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={mode === 'CREDIT' ? 'e.g. Referral reward' : 'e.g. Withdrawal processed'}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`adjust-reference-${mode}`}>Reference</Label>
              <Input
                id={`adjust-reference-${mode}`}
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional — e.g. TXN-123"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy} className="gap-1.5">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'CREDIT' ? 'Credit wallet' : 'Debit wallet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Per-row actions on the wallet list: credit / debit + history link. */
export function WalletRowActions({
  userId,
  walletId,
  studentName,
}: {
  userId: string
  walletId: string | null
  studentName: string
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <WalletAdjustButton walletId={walletId} userId={userId} studentName={studentName} mode="CREDIT" />
      <WalletAdjustButton walletId={walletId} userId={userId} studentName={studentName} mode="DEBIT" />
      {walletId && (
        <Button asChild size="sm" variant="ghost">
          <Link href={`/admin/wallet/${walletId}`}>History</Link>
        </Button>
      )}
    </div>
  )
}

/** Bulk credit: credits every student wallet (optionally scoped to a course). */
export function WalletBulkCreditButton({ courses }: { courses: { id: string; name: string }[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [courseId, setCourseId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const amt = Number(amount)
  const valid = Number.isFinite(amt) && amt > 0 && reason.trim().length > 0
  const courseName = courses.find((c) => c.id === courseId)?.name

  async function doBulk() {
    setBusy(true)
    try {
      const r = await fetch('/api/admin/wallet/bulk-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: courseId || null, amount: amt, reason: reason.trim() }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success(
        `Credited ${formatCurrency(amt)} to ${data.affected as number} student wallet${(data.affected as number) === 1 ? '' : 's'}.`
      )
      setOpen(false)
      setAmount('')
      setReason('')
      setCourseId('')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Users className="h-3.5 w-3.5" />
        Bulk credit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk credit student wallets</DialogTitle>
            <DialogDescription>
              Credit an amount to every student wallet{courseId ? ' in the selected course' : ''}. Wallet rows are
              created automatically for students that don&apos;t have one yet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-course">Scope</Label>
              <select
                id="bulk-course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
              >
                <option value="">All students</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-amount">
                Amount per wallet (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bulk-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bulk-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Festive season bonus credit"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <ConfirmDialog
              trigger={
                <Button disabled={!valid} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Continue
                </Button>
              }
              title="Credit these wallets?"
              description={
                <>
                  Credit <strong>{valid ? formatCurrency(amt) : '—'}</strong> to{' '}
                  <strong>{courseId ? `all ${courseName} students` : 'ALL students'}</strong>. A wallet transaction
                  will be recorded for every affected student.
                </>
              }
              confirmLabel="Credit wallets"
              destructive={false}
              onConfirm={doBulk}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
