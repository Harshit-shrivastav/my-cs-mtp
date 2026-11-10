'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Loader2,
  Upload,
  Save,
  AlertCircle,
  FileCheck2,
  Download,
  CheckCircle2,
  ArrowLeft,
  Award,
} from 'lucide-react'

interface Props {
  assignmentId: string
  maxMarks: number
  initialMarks: number | null
  initialRemarks: string
  initialEvaluatedFileName: string | null
  initialEvaluatedFileKey: string | null
  /** Stable URL for downloading the existing evaluated file (if any). */
  evaluatedDownloadHref: string | null
  /** Stable URL for downloading the student's uploaded answer sheet. */
  studentAnswerSheetHref: string
  isAlreadyEvaluated: boolean
  student: { name: string | null; email: string }
  paper: { title: string; totalMarks: number }
  subject: { name: string }
  course: { name: string }
  submittedAt: string
  status: string
  /** Override the API endpoint. Defaults to the examiner evaluate endpoint. */
  endpoint?: string
  /** Override where to go after submit. Defaults to /examiner/evaluated. */
  redirectHref?: string
  /** Override the "back" link href. Defaults to /examiner. */
  backHref?: string
}

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
const MAX_BYTES = 50 * 1024 * 1024

export default function EvaluateForm({
  assignmentId,
  maxMarks,
  initialMarks,
  initialRemarks,
  initialEvaluatedFileName,
  initialEvaluatedFileKey,
  evaluatedDownloadHref,
  studentAnswerSheetHref,
  isAlreadyEvaluated,
  student,
  paper,
  subject,
  course,
  submittedAt,
  status,
  endpoint = '/api/examiner/evaluate',
  redirectHref = '/examiner/evaluated',
  backHref = '/examiner',
}: Props) {
  const router = useRouter()
  const [marks, setMarks] = useState<string>(initialMarks != null ? String(initialMarks) : '')
  const [remarks, setRemarks] = useState<string>(initialRemarks || '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [marksError, setMarksError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const marksNum = useMemo(() => {
    const n = Number(marks)
    return Number.isFinite(n) ? n : NaN
  }, [marks])

  function validateMarks(): boolean {
    if (marks.trim() === '') {
      setMarksError('Enter the marks awarded.')
      return false
    }
    if (Number.isNaN(marksNum)) {
      setMarksError('Marks must be a number.')
      return false
    }
    if (marksNum < 0) {
      setMarksError('Marks cannot be negative.')
      return false
    }
    if (marksNum > maxMarks) {
      setMarksError(`Marks cannot exceed the paper total of ${maxMarks}.`)
      return false
    }
    setMarksError(null)
    return true
  }

  async function onSubmit() {
    if (!validateMarks()) return

    if (!file && !initialEvaluatedFileKey) {
      toast.error('Please upload the evaluated/checked file.')
      return
    }

    if (file) {
      if (file.size > MAX_BYTES) {
        toast.error('File is larger than 50 MB.')
        return
      }
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error('Unsupported file type. Allowed: PDF, JPG, PNG, DOC, DOCX.')
        return
      }
    }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('assignmentId', assignmentId)
      fd.append('marks', String(marksNum))
      fd.append('remarks', remarks)
      if (file) fd.append('file', file)

      const r = await fetch(endpoint, {
        method: 'POST',
        body: fd,
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast.error(data.error || 'Could not submit evaluation.')
        return
      }
      toast.success(isAlreadyEvaluated ? 'Evaluation updated.' : 'Evaluation submitted. The student has been notified by email.')
      // Give the toast a moment, then redirect.
      setTimeout(() => router.push(redirectHref), 700)
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  const submittedDate = new Date(submittedAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 gap-1 text-muted-foreground">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            Back to assignments
          </Link>
        </Button>
      </div>

      {/* Header / student + paper context */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">{paper.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {subject.name} — {course.name}
            </p>
          </div>
          <div className="text-right text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Submitted</div>
            <div className="font-medium tabular-nums">{submittedDate}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoTile label="Student" value={student.name || student.email.split('@')[0]} />
          <InfoTile label="Email" value={student.email} />
          <InfoTile label="Paper total" value={`${paper.totalMarks} marks`} />
          <InfoTile label="Status" value={prettyStatus(status)} />
        </div>

        {/* Download student answer sheet */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <a
            href={studentAnswerSheetHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-3.5 w-3.5" />
            Download student answer sheet
          </a>
          {isAlreadyEvaluated && evaluatedDownloadHref && (
            <a
              href={evaluatedDownloadHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              {initialEvaluatedFileName || 'Previously evaluated file'}
            </a>
          )}
        </div>
      </div>

      {/* Evaluation form */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-semibold">
            {isAlreadyEvaluated ? 'Re-evaluate / Update' : 'Submit evaluation'}
          </h3>
          {isAlreadyEvaluated && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
              <Award className="h-3 w-3" />
              Currently evaluated: {initialMarks ?? '—'}/{maxMarks}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="marks">Marks awarded</Label>
          <Input
            id="marks"
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            max={maxMarks}
            value={marks}
            disabled={busy}
            onChange={(e) => setMarks(e.target.value)}
            onBlur={validateMarks}
            placeholder={`0 – ${maxMarks}`}
            aria-invalid={!!marksError}
            className="max-w-[12rem]"
          />
          {marksError ? (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> {marksError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Out of <span className="font-medium">{maxMarks}</span> total marks for this paper.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="remarks">Remarks / feedback</Label>
          <Textarea
            id="remarks"
            value={remarks}
            disabled={busy}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Share your evaluation notes with the student (strengths, areas to improve, suggestions)…"
            rows={5}
            maxLength={4000}
          />
          <p className="text-xs text-muted-foreground">{remarks.length}/4000 characters.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="eval-file">
            {isAlreadyEvaluated ? 'Replace evaluated file (optional)' : 'Upload evaluated / checked file'}
          </Label>
          <input
            id="eval-file"
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-xs file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-accent"
          />
          {file ? (
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <FileCheck2 className="h-3.5 w-3.5" />
              Selected: <span className="font-medium text-foreground">{file.name}</span>{' '}
              <span className="text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            </p>
          ) : isAlreadyEvaluated && initialEvaluatedFileName ? (
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <FileCheck2 className="h-3.5 w-3.5" />
              Current: <span className="font-medium text-foreground">{initialEvaluatedFileName}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOC or DOCX — up to 50 MB.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <Button onClick={onSubmit} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isAlreadyEvaluated ? <Save className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            {isAlreadyEvaluated ? 'Update evaluation' : 'Submit evaluation'}
          </Button>
          <Button asChild variant="outline" disabled={busy}>
            <Link href={backHref}>Cancel</Link>
          </Button>
          <span className="text-xs text-muted-foreground">
            On submit, the student is notified by email and the evaluated file is stored securely.
          </span>
        </div>
      </div>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium truncate" title={value}>
        {value}
      </div>
    </div>
  )
}

function prettyStatus(s: string): string {
  switch (s) {
    case 'SUBMITTED':
      return 'Submitted'
    case 'ASSIGNED':
      return 'Assigned to examiner'
    case 'UNDER_EVALUATION':
      return 'Under evaluation'
    case 'EVALUATED':
      return 'Evaluated'
    default:
      return s
  }
}
