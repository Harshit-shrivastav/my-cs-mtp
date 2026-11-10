// MY CS MTP — Student upload of an answer sheet.
// Validates: STUDENT-only, assignment uploads enabled, user entitled to the paper,
// file type/size, then uploads to storage and creates/updates the Assignment row.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, isAuthCtx } from '@/lib/guards'
import { getSettings } from '@/lib/settings'
import { serverUpload, isAllowedType } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'])

export async function POST(req: Request) {
  const ctx = await requireRole(req, 'STUDENT')
  if (!isAuthCtx(ctx)) return ctx
  const userId = ctx.user.id

  const settings = await getSettings()
  if (!settings.assignmentUploadEnabled) {
    return NextResponse.json(
      { error: settings.assignmentUploadDisabledMessage || 'Assignment uploads are temporarily disabled.' },
      { status: 403 }
    )
  }

  // Parse multipart
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 })
  }

  const paperId = String(form.get('paperId') || '')
  if (!paperId) return NextResponse.json({ error: 'Missing paperId.' }, { status: 400 })

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
  }

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
  if (file.type && !isAllowedType(file.type) && !file.type.startsWith('image/')) {
    return NextResponse.json(
      { error: 'Unsupported MIME type.' },
      { status: 400 }
    )
  }

  // Validate entitlement: user has a Purchase for that paper's planSubject (not revoked)
  const paper = await db.testPaper.findUnique({
    where: { id: paperId },
    select: { id: true, planSubjectId: true, totalMarks: true, isActive: true },
  })
  if (!paper || !paper.isActive) {
    return NextResponse.json({ error: 'Paper not found.' }, { status: 404 })
  }

  const purchase = await db.purchase.findFirst({
    where: { userId, planSubjectId: paper.planSubjectId, isRevoked: false },
    select: { id: true },
  })
  if (!purchase) {
    return NextResponse.json({ error: 'You have not purchased this subject.' }, { status: 403 })
  }

  // Find or create the Assignment row
  let assignment = await db.assignment.findFirst({
    where: { studentId: userId, paperId: paper.id },
    select: { id: true, status: true },
  })

  // Don't allow re-upload after evaluation (examiner would have to re-evaluate)
  if (assignment && assignment.status === 'EVALUATED') {
    return NextResponse.json(
      { error: 'This answer sheet has already been evaluated. Please contact support to re-upload.' },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const now = Date.now().toString(36)

  // Determine examiner assignment for the paper (via ExaminerPaper)
  const examinerLink = await db.examinerPaper.findFirst({
    where: { paperId: paper.id },
    select: { examinerId: true },
  })

  if (assignment) {
    const key = `assignments/student/${userId}/${assignment.id}.${ext}`
    await serverUpload(key, buffer, file.type || 'application/octet-stream')
    assignment = await db.assignment.update({
      where: { id: assignment.id },
      data: {
        uploadedFileKey: key,
        fileName: file.name,
        fileSize: file.size,
        status: examinerLink ? 'ASSIGNED' : 'SUBMITTED',
        examinerId: examinerLink?.examinerId ?? null,
        submittedAt: new Date(),
        evaluatedAt: null,
        marks: null,
        maxMarks: null,
        remarks: null,
        evaluatedFileKey: null,
        evaluatedFileName: null,
      },
      select: { id: true, status: true },
    })
  } else {
    // Create the row first to get an id, then upload using the id in the key.
    const created = await db.assignment.create({
      data: {
        studentId: userId,
        paperId: paper.id,
        status: 'SUBMITTED',
        maxMarks: paper.totalMarks,
        examinerId: examinerLink?.examinerId ?? null,
      },
      select: { id: true, status: true },
    })
    const key = `assignments/student/${userId}/${created.id}.${ext}`
    await serverUpload(key, buffer, file.type || 'application/octet-stream')
    assignment = await db.assignment.update({
      where: { id: created.id },
      data: {
        uploadedFileKey: key,
        fileName: file.name,
        fileSize: file.size,
        status: examinerLink ? 'ASSIGNED' : 'SUBMITTED',
        submittedAt: new Date(),
      },
      select: { id: true, status: true },
    })
    void now // unused — kept for clarity in case we want a filename suffix later
  }

  return NextResponse.json({
    assignmentId: assignment.id,
    status: assignment.status,
  })
}
