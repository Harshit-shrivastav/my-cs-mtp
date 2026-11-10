// MY CS MTP — Examiner submits an evaluation (POST /api/examiner/evaluate).
// Accepts multipart/form-data: assignmentId, marks, remarks, file.
// Validates the examiner's scope, validates 0 <= marks <= paper.totalMarks,
// uploads the evaluated file to storage, updates the Assignment row to
// EVALUATED and emails the student.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { getExaminerScope, examinerCanEvaluate } from '@/lib/examiner'
import { serverUpload } from '@/lib/storage'
import { sendEvaluationEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'])

export async function POST(req: Request) {
  const ctx = await requireRole(req, 'EXAMINER')
  if (!isAuthCtx(ctx)) return ctx
  const examinerId = ctx.user.id

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 })
  }

  const assignmentId = String(form.get('assignmentId') || '')
  if (!assignmentId) {
    return NextResponse.json({ error: 'Missing assignmentId.' }, { status: 400 })
  }

  const marksRaw = String(form.get('marks') || '')
  const marks = Number(marksRaw)
  if (!Number.isFinite(marks)) {
    return NextResponse.json({ error: 'Marks must be a number.' }, { status: 400 })
  }
  if (marks < 0) {
    return NextResponse.json({ error: 'Marks cannot be negative.' }, { status: 400 })
  }

  const remarks = String(form.get('remarks') || '').slice(0, 4000)

  const file = form.get('file')
  // File is optional only if there's already an evaluated file on the assignment.
  // We validate that below once we've loaded the assignment row.
  if (file && !(file instanceof File)) {
    return NextResponse.json({ error: 'Invalid file upload.' }, { status: 400 })
  }
  if (file instanceof File) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File is larger than 50 MB.' }, { status: 400 })
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: PDF, JPG, PNG, DOC, DOCX.' },
        { status: 400 }
      )
    }
  }

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      status: true,
      evaluatedFileKey: true,
      paper: { select: { id: true, title: true, totalMarks: true, subjectId: true } },
      student: { select: { id: true, name: true, email: true } },
    },
  })
  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 })
  }

  // Marks upper bound check
  const maxMarks = assignment.paper.totalMarks
  if (marks > maxMarks) {
    return NextResponse.json(
      { error: `Marks cannot exceed the paper total of ${maxMarks}.` },
      { status: 400 }
    )
  }

  // Scope check
  const scope = await getExaminerScope(examinerId)
  if (!examinerCanEvaluate(scope, assignment.paper.id, assignment.paper.subjectId)) {
    return NextResponse.json(
      { error: 'You are not authorized to evaluate this assignment.' },
      { status: 403 }
    )
  }

  // Either a new file or an existing evaluated file must be present.
  if (!file && !assignment.evaluatedFileKey) {
    return NextResponse.json(
      { error: 'Please upload the evaluated/checked file.' },
      { status: 400 }
    )
  }

  // Upload the new file (if any) to storage at assignments/evaluated/<assignmentId>.<ext>
  let evaluatedFileKey = assignment.evaluatedFileKey
  let evaluatedFileName: string | null = null
  if (file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    evaluatedFileKey = `assignments/evaluated/${assignment.id}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    await serverUpload(evaluatedFileKey, buffer, file.type || 'application/octet-stream')
    evaluatedFileName = file.name
  }

  const updated = await db.assignment.update({
    where: { id: assignment.id },
    data: {
      status: 'EVALUATED',
      examinerId,
      marks,
      maxMarks,
      remarks,
      evaluatedFileKey,
      evaluatedFileName: evaluatedFileName ?? undefined,
      evaluatedAt: new Date(),
    },
    select: { id: true, status: true, marks: true, maxMarks: true },
  })

  // Notify the student (best-effort — never block the response on email)
  try {
    await sendEvaluationEmail(
      assignment.student.email,
      assignment.paper.title,
      marks,
      maxMarks
    )
  } catch (e) {
    console.error('sendEvaluationEmail failed (non-fatal):', e)
  }

  return NextResponse.json({ ok: true, assignment: updated })
}
