'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface UploadProgressProps {
  /** 0–100 */
  value: number
  label?: string
  className?: string
  /** Hide the value text — show only the bar */
  bare?: boolean
}

/**
 * Small progress bar component for showing upload progress.
 * Renders nothing when value is 0 (or below) so callers can mount it
 * conditionally without leaving an empty bar on the page.
 */
export function UploadProgress({ value, label, className, bare }: UploadProgressProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)))
  if (pct <= 0) return null
  return (
    <div className={cn('space-y-1', className)}>
      <Progress value={pct} className="h-1.5" />
      {!bare && (
        <div className="text-xs text-muted-foreground">
          {label ? `${label} ` : 'Uploading… '}
          {pct}%
        </div>
      )}
    </div>
  )
}
