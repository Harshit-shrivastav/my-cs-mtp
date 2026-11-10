// MY CS MTP — Exam timing helpers shared by admin API routes and the admin page.
import { z } from 'zod'

export function daysRemaining(examDate: Date): number {
  const now = new Date()
  return Math.max(0, Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

export function handleExamTimingPrismaError(e: unknown, fallback: string): string {
  const anyE = e as { code?: string }
  if (anyE?.code === 'P2002') {
    return 'That course already has an exam countdown (one countdown per course).'
  }
  return fallback
}

export const examTimingSchema = z.object({
  examName: z.string().trim().min(1, 'Exam name is required.').max(200, 'Exam name is too long.'),
  courseKey: z.enum(['CSEET', 'CS_EXECUTIVE', 'CS_PROFESSIONAL', 'CUSTOM']),
  courseId: z.string().trim().max(100).nullable().optional(),
  examDate: z
    .string()
    .min(1, 'Exam date is required.')
    .refine((v) => !isNaN(Date.parse(v)), 'Enter a valid exam date/time.'),
  isVisible: z.boolean().optional().default(true),
})
