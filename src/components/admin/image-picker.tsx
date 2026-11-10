'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { UploadProgress } from '@/components/admin/upload-progress'
import { toast } from 'sonner'
import { Image as ImageIcon, Loader2, Upload, X } from 'lucide-react'
import { publicUrl } from '@/lib/storage-url'
import Image from 'next/image'

export interface ImagePickerProps {
  /** Storage prefix used to build the object key, e.g. 'courses' or 'seo/plans'. */
  keyPrefix: string
  /** Existing object key (when editing) */
  initialKey?: string | null
  /** Existing alt text (when editing) */
  initialAlt?: string | null
  /** Called whenever a new key is uploaded or removed. */
  onChange: (key: string, fileName: string) => void
  /** Maximum file size in bytes (default 5 MB) */
  maxSize?: number
  /** Disabled state (form is submitting) */
  disabled?: boolean
  /** Accept attribute for the input — defaults to common image extensions. */
  acceptMime?: string
  /** className override */
  className?: string
  /** Show a side-by-side preview. Default true. */
  preview?: boolean
}

/**
 * Image upload + preview component. Requests a presigned upload URL from
 * /api/admin/upload-url, then PUTs the file (R2 mode) or POSTs the file
 * (local mode). Shows upload progress.
 */
export function ImagePicker({
  keyPrefix,
  initialKey,
  initialAlt,
  onChange,
  maxSize = 5 * 1024 * 1024,
  disabled,
  acceptMime = 'image/jpeg,image/png,image/webp,image/gif',
  className,
  preview = true,
}: ImagePickerProps) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentKey, setCurrentKey] = useState<string | null>(initialKey || null)
  const [currentName, setCurrentName] = useState<string>(
    initialKey ? initialKey.split('/').pop() || initialKey : ''
  )
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (disabled) return
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed.')
      return
    }
    if (file.size > maxSize) {
      toast.error(`Image is larger than ${(maxSize / 1024 / 1024).toFixed(0)} MB.`)
      return
    }
    setBusy(true)
    setProgress(0)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const stamp = Date.now().toString(36)
      const year = new Date().getFullYear()
      const key = `${keyPrefix}/${year}/${stamp}-${safeName}`
      const contentType = file.type || 'image/octet-stream'

      const urlRes = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, contentType, imageOnly: true }),
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
      toast.success('Image uploaded.')
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

  const previewUrl = currentKey ? publicUrl(currentKey) : null

  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        {preview && previewUrl ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
            <Image
              src={previewUrl}
              alt={initialAlt || currentName || 'preview'}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border bg-muted">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept={acceptMime}
            disabled={disabled || busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
            className="block w-full text-xs file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-accent"
          />
          {busy && <UploadProgress value={progress} />}
          {currentKey && !busy && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-xs">
              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium truncate">{currentName}</span>
              <button
                type="button"
                onClick={clear}
                className="ml-auto inline-flex items-center text-muted-foreground hover:text-destructive"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {busy && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
      </div>
    </div>
  )
}
