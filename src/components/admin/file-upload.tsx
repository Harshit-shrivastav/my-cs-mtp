'use client'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'

interface UploadResult {
  key: string
  url: string | null
  name: string
}

interface FileUploadProps {
  /** Allowed file extensions, e.g. ['pdf', 'doc', 'docx']. */
  acceptExtensions?: string[]
  /** Accept attribute for the input (defaults to the joined extensions). */
  acceptMime?: string
  /** Maximum file size in bytes (default 50 MB). */
  maxSize?: number
  /** Storage prefix used to build the object key, e.g. 'courses' or 'papers'. */
  keyPrefix: string
  /** Whether to restrict to image types. */
  imageOnly?: boolean
  /** Initial value (existing object key + url + name) when editing. */
  initial?: { key: string; name: string }
  /** Called whenever a new file is uploaded (returns the resulting key). */
  onUploaded: (result: UploadResult) => void
  /** Allow clearing the current value. */
  onClear?: () => void
  /** Whether the form is busy/disabled. */
  disabled?: boolean
}

export function FileUpload({
  acceptExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp'],
  acceptMime,
  maxSize = 50 * 1024 * 1024,
  keyPrefix,
  imageOnly = false,
  initial,
  onUploaded,
  onClear,
  disabled = false,
}: FileUploadProps) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [current, setCurrent] = useState<{ name: string; key: string } | null>(
    initial ? { key: initial.key, name: initial.name } : null
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptAttr = acceptMime
    ? acceptMime
    : acceptExtensions.map((e) => `.${e}`).join(',')

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
      // 1. Get the presigned URL / local upload endpoint
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const stamp = Date.now().toString(36)
      const year = new Date().getFullYear()
      const key = `${keyPrefix}/${year}/${stamp}-${safeName}`
      const contentType = file.type || 'application/octet-stream'

      const urlRes = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, contentType, imageOnly }),
      })
      if (!urlRes.ok) {
        const data = await urlRes.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to get upload URL.')
      }
      const { url, mode } = await urlRes.json()

      // 2. Upload the file
      if (mode === 'presigned') {
        // R2: PUT directly to the presigned URL
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', url, true)
          xhr.setRequestHeader('Content-Type', contentType)
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100))
            }
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error(`Upload failed (HTTP ${xhr.status}).`))
          }
          xhr.onerror = () => reject(new Error('Network error during upload.'))
          xhr.send(file)
        })
      } else {
        // Local mode: POST multipart to /api/storage/upload
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', url, true)
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100))
            }
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
      setCurrent({ key, name: file.name })
      onUploaded({ key, url: null, name: file.name })
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
    setCurrent(null)
    onClear?.()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
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
      {busy && progress > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <div className="text-xs text-muted-foreground">Uploading… {progress}%</div>
        </div>
      )}
      {current && !busy && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          {imageOnly ? (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium truncate">{current.name}</span>
          <span className="text-muted-foreground truncate">— {current.key}</span>
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

/** Convenience wrapper that uses image-only restrictions. */
export function ImageUpload(props: Omit<FileUploadProps, 'imageOnly' | 'acceptExtensions'> & { acceptExtensions?: string[] }) {
  return (
    <FileUpload
      {...props}
      imageOnly
      acceptExtensions={props.acceptExtensions ?? ['jpg', 'jpeg', 'png', 'webp']}
    />
  )
}
