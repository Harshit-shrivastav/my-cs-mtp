'use client'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

export interface FormFieldProps {
  /** Field id (used for htmlFor + label association) */
  id: string
  /** Visible label */
  label: string
  /** Render the actual control (input, select, textarea…) */
  children: ReactNode
  /** Helper text shown below the control */
  helpText?: string
  /** Error text — when present, replaces the helper text + turns label red */
  error?: string | null
  required?: boolean
  /** Span across all columns in a grid layout. Defaults to false. */
  full?: boolean
  className?: string
}

/**
 * Labeled form field wrapper with consistent spacing, required asterisk,
 * helper text and error display.
 */
export function FormField({
  id,
  label,
  children,
  helpText,
  error,
  required,
  full,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', full && 'sm:col-span-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : helpText ? (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      ) : null}
    </div>
  )
}
