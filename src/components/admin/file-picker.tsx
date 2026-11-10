'use client'

import { useRef, useState } from 'react'
import { UploadProgress } from '@/components/admin/upload-progress'
import { toast } from 'sonner'
import { FileText, Loader2, Upload, X } from 'lucide-react'

export interface FilePickerProps {
  /** Storage prefix used to build the object key, e.g. 'papers' or 'papers/answers'. */
  keyPrefix: string
  /** Existing object key (when editing) */
  initialKey?: string | null
  /** Existing file name (when editing) — defaults to the last segment of the key */
  initialName?: string | null
  /** Called whenever a new file is uploaded or removed. */
  onChange: (key: string, fileName: string) => void
  /** Allowed file extensions (without dot). Default: common document types. */
  acceptExtensions?: string[]
  /** Maximum file size in bytes (default 50 MB) */
  maxSize?: number
  /** Disabled state (form is submitting) */
  disabled?: boolean
  /** className override */
  className?: string
}

/**
 * File upload component. Requests a presigned upload URL from
 * /api/admin/upload-url, then PUTs the file (R2 mode) or POSTs the file
 * (local mode). Shows upload progress.
 */
export function FilePicker({
  keyPrefix,
  initialKey,
  initialName,
  onChange,
  acceptExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'],
  maxSize = 50 * 1024 * 1024,
  disabled,
  className,
}: FilePickerProps) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentKey, setCurrentKey] = useState<string | null>(initialKey || null)
  const [currentName, setCurrentName] = useState<string>(
    initialName || (initialKey ? initialKey.split('/').pop() || initialKey : '')
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptAttr = acceptExtensions.map((e) => `.${e}`).join(',')

  async function handleFile(file: File) {
    if (disabled) return
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!acceptExtensions.includes(ext)) {
      toast.error(`Unsupported file type. Allowed: ${acceptExtensions.join(', ')}.`)
      return
    }
    if (file.size > maxSize) {
      toast.error(`File is larger than ${(maxSize / 1024 / 1024).toFixed(0)} MB.`)
      return
    }
    setBusy(true)
    setProgress(0)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const stamp = Date.now().toString(36)
      const year = new Date().getFullYear()
      const key = `${keyPrefix}/${year}/${stamp}-${safeName}`
      const contentType = file.type || 'application/octet-stream'

      const urlRes = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, contentType }),
      })
      if (!urlRes.ok) {
        const data = await urlRes.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to get upload URL.')
      }
      const { url, mode } = await urlRes.json()

      if (mode === 'presigned') {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', url, true)
          xhr.setRequestHeader('Content-Type', contentType)
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error(`Upload failed (HTTP ${xhr.status}).`))
          }
          xhr.onerror = () => reject(new Error('Network error during upload.'))
          xhr.send(file)
        })
      } else {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', url, true)
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error(`Upload failed (HTTP ${xhr.status}).`))
          }
          xhr.onerror = () => reject(new Error('Network error during upload.'))
          const fd = new FormData()
          fd.append('key', key)
          fd.append('file', file)
          xhr.send(fd)
        })
      }

      setProgress(100)
      setCurrentKey(key)
      setCurrentName(file.name)
      onChange(key, file.name)
      toast.success('File uploaded.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setBusy(false)
      setProgress(0)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function clear() {
    if (disabled) return
    setCurrentKey(null)
    setCurrentName('')
    onChange('', '')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        disabled={disabled || busy}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
        }}
        className="block w-full text-xs file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-accent"
      />
      {busy && <UploadProgress value={progress} className="mt-2" />}
      {currentKey && !busy && (
        <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium truncate">{currentName}</span>
          <span className="text-muted-foreground truncate hidden sm:inline">— {currentKey}</span>
          {!disabled && (
            <button
              type="button"
              onClick={clear}
              className="ml-auto inline-flex items-center text-muted-foreground hover:text-destructive"
              aria-label="Remove file"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
      {busy && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
    </div>
  )
}
