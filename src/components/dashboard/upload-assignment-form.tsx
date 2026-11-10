'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Upload, FileCheck2, AlertCircle } from 'lucide-react'
import type { AssignmentStatus } from '@prisma/client'

interface Props {
  paperId: string
  paperTitle: string
  enabled: boolean
  disabledMessage?: string
  currentStatus?: AssignmentStatus | null
  hasExistingFile?: boolean
}

export default function UploadAssignmentForm({
  paperId,
  paperTitle,
  enabled,
  disabledMessage,
  currentStatus,
  hasExistingFile,
}: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastStatus, setLastStatus] = useState<AssignmentStatus | null | undefined>(currentStatus)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onSubmit() {
    if (!file) {
      toast.error('Please choose a file first.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File is larger than 50 MB.')
      return
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'].includes(ext)) {
      toast.error('Unsupported file type. Allowed: PDF, JPG, PNG, DOC, DOCX.')
      return
    }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('paperId', paperId)
      fd.append('file', file)
      const r = await fetch('/api/student/upload-assignment', {
        method: 'POST',
        body: fd,
      })
      const data = await r.json()
      if (!r.ok) {
        toast.error(data.error || 'Could not upload answer sheet.')
        return
      }
      toast.success(`Uploaded "${file.name}" for ${paperTitle}.`)
      setLastStatus(data.status as AssignmentStatus)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      // Soft-refresh the page so status & download buttons update
      setTimeout(() => window.location.reload(), 800)
    } catch (e) {
      toast.error('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png"
        disabled={!enabled || busy}
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="text-xs file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-accent"
      />
      <Button
        onClick={onSubmit}
        disabled={!enabled || busy || !file}
        size="sm"
        className="gap-1.5"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {hasExistingFile ? 'Re-upload' : 'Upload'}
      </Button>
      {!enabled && disabledMessage && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" /> Uploads paused
        </span>
      )}
      {enabled && lastStatus && lastStatus !== 'SUBMITTED' && lastStatus !== 'ASSIGNED' && (
        <span className="inline-flex items-center gap-1 text-xs text-foreground">
          <FileCheck2 className="h-3.5 w-3.5" /> {prettyStatus(lastStatus)}
        </span>
      )}
    </div>
  )
}

function prettyStatus(s: AssignmentStatus): string {
  switch (s) {
    case 'SUBMITTED': return 'Submitted'
    case 'ASSIGNED': return 'Submitted & assigned'
    case 'UNDER_EVALUATION': return 'Under evaluation'
    case 'EVALUATED': return 'Evaluated'
  }
}
