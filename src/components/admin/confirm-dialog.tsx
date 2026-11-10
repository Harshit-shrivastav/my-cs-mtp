'use client'

import { useState, useTransition } from 'react'
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
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ConfirmDialogProps {
  trigger: React.ReactNode
  title?: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => Promise<void> | void
  /** Optional confirmation input — e.g. "type DELETE to confirm" */
  confirmPhrase?: string
  /** Show the toast on success automatically */
  successMessage?: string
  /** Skip the dialog and run onConfirm immediately (still requires async wait) */
  /** Skip the dialog when trigger is itself a button — when this is false, the
   *  dialog is opened on click and the user must press Confirm. */
  /** Allow extra fields / body to be supplied by the consumer via render-prop */
  children?: (opts: { close: () => void }) => React.ReactNode
}

export function ConfirmDialog({
  trigger,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  confirmPhrase,
  successMessage,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [_, startTransition] = useTransition()
  void _

  const phraseOk = !confirmPhrase || phrase.trim() === confirmPhrase

  async function handleConfirm() {
    if (!phraseOk) return
    setBusy(true)
    try {
      await onConfirm()
      if (successMessage) toast.success(successMessage)
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed.')
    } finally {
      setBusy(false)
      setPhrase('')
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setPhrase('')
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
              {confirmPhrase && (
                <div>
                  <p className="text-xs">
                    Type <span className="font-mono font-semibold">{confirmPhrase}</span> to confirm.
                  </p>
                  <input
                    type="text"
                    autoFocus
                    value={phrase}
                    onChange={(e) => startTransition(() => setPhrase(e.target.value))}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder={confirmPhrase}
                  />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              void handleConfirm()
            }}
            disabled={busy || !phraseOk}
            className={destructive ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface AsyncActionProps {
  children: React.ReactNode
  onClick: () => Promise<void> | void
  successMessage?: string
  errorMessage?: string
  /** Disable while pending */
}

/** A button-style wrapper that runs an async action and shows a toast. */
export function AsyncActionButton({
  children,
  onClick,
  successMessage,
  errorMessage = 'Action failed.',
  ...rest
}: AsyncActionProps & React.ComponentProps<typeof Button>) {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      {...rest}
      disabled={busy || rest.disabled}
      onClick={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await onClick()
          if (successMessage) toast.success(successMessage)
        } catch (e) {
          toast.error(e instanceof Error ? e.message : errorMessage)
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </Button>
  )
}
