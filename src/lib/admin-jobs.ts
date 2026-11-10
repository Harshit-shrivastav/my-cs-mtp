// MY CS MTP — tracked admin jobs.
// Destructive/long-running admin actions run as Job rows the admin can poll
// (GET /api/admin/jobs/[id]) — status QUEUED → RUNNING → COMPLETED | FAILED.
import { db } from '@/lib/db'

export interface TrackedJobResult {
  jobId: string
}

/**
 * Create a Job row, run `fn`, and record the outcome.
 * Returns the job id immediately usable by the client for polling.
 * `fn` runs in-process (awaited) — the job row is the audit trail + poll target.
 */
export async function runTrackedJob<T>(
  type: string,
  payload: Record<string, unknown>,
  createdBy: string,
  fn: () => Promise<T>
): Promise<string> {
  const job = await db.job.create({
    data: {
      type,
      payload: JSON.stringify(payload),
      status: 'RUNNING',
      createdBy,
    },
    select: { id: true },
  })
  try {
    const result = await fn()
    await db.job.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', result: JSON.stringify(result ?? {}) },
    })
  } catch (e) {
    await db.job.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        result: e instanceof Error ? e.message : 'Unknown error.',
      },
    })
    throw e
  }
  return job.id
}
