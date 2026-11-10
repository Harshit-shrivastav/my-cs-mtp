'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/admin/file-upload'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { toast } from 'sonner'
import { Loader2, Save, Plus, Pencil, Trash2 } from 'lucide-react'

interface Course { id: string; name: string }

interface FreeResourceListItem {
  id: string
  title: string
  description: string | null
  courseId: string | null
  fileKey: string | null
  imageKey: string | null
  imageAlt: string | null
  isPublic: boolean
  sortOrder: number
  isActive: boolean
}

interface FreeResourceFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  courses: Course[]
  initial?: FreeResourceListItem | null
  onSuccess?: () => void
}

export function FreeResourceForm({
  open,
  onOpenChange,
  courses,
  initial,
}: FreeResourceFormProps) {
  const router = useRouter()
  const isEdit = !!initial

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('')
  const [fileKey, setFileKey] = useState('')
  const [fileName, setFileName] = useState('')
  const [imageKey, setImageKey] = useState('')
  const [imageName, setImageName] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setTitle(initial.title)
      setDescription(initial.description || '')
      setCourseId(initial.courseId || '')
      setFileKey(initial.fileKey || '')
      setFileName(initial.fileKey ? initial.fileKey.split('/').pop() || '' : '')
      setImageKey(initial.imageKey || '')
      setImageName(initial.imageKey ? initial.imageKey.split('/').pop() || '' : '')
      setImageAlt(initial.imageAlt || '')
      setIsPublic(initial.isPublic)
      setSortOrder(String(initial.sortOrder))
      setIsActive(initial.isActive)
    } else {
      setTitle(''); setDescription(''); setCourseId(''); setFileKey(''); setFileName(''); setImageKey(''); setImageName(''); setImageAlt(''); setIsPublic(true); setSortOrder('0'); setIsActive(true)
    }
  }, [open, initial])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error('Title is required.'); return }
    setBusy(true)
    try {
      const payload = {
        title,
        description: description || null,
        courseId: courseId || null,
        fileKey: fileKey || null,
        imageKey: imageKey || null,
        imageAlt: imageAlt || null,
        isPublic,
        sortOrder: Number(sortOrder) || 0,
        isActive,
      }
      const url = isEdit ? `/api/admin/free-resources/${initial!.id}` : '/api/admin/free-resources'
      const method = isEdit ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed.')
      toast.success(isEdit ? 'Updated.' : 'Created.')
      onOpenChange(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit free resource' : 'Create free resource'}</DialogTitle>
          <DialogDescription>{isEdit ? initial!.title : 'Add a new publicly-available free resource.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courseId">Course (optional)</Label>
              <select
                id="courseId"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
              >
                <option value="">Any course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sortOrder">Sort order</Label>
              <Input id="sortOrder" type="number" min="0" step="1" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Image (cover)</Label>
              <FileUpload
                keyPrefix="free/images"
                acceptExtensions={['jpg', 'jpeg', 'png', 'webp']}
                imageOnly
                initial={imageKey ? { key: imageKey, name: imageName } : undefined}
                onUploaded={(r) => { setImageKey(r.key); setImageName(r.name) }}
                onClear={() => { setImageKey(''); setImageName('') }}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="imageAlt">Image alt text</Label>
              <Input id="imageAlt" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>File</Label>
              <FileUpload
                keyPrefix="free/files"
                acceptExtensions={['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']}
                initial={fileKey ? { key: fileKey, name: fileName } : undefined}
                onUploaded={(r) => { setFileKey(r.key); setFileName(r.name) }}
                onClear={() => { setFileKey(''); setFileName('') }}
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input
                id="isPublic"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="isPublic" className="cursor-pointer">Public</Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isEdit ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FreeResourceActions({
  courses,
  initial,
}: {
  courses: Course[]
  initial: FreeResourceListItem | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const isEdit = !!initial
  return (
    <>
      <Button size="sm" variant={isEdit ? 'outline' : 'default'} onClick={() => setOpen(true)} className="gap-1.5">
        {isEdit ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {isEdit ? 'Edit' : 'Create'}
      </Button>
      <FreeResourceForm
        open={open}
        onOpenChange={setOpen}
        courses={courses}
        initial={initial}
        onSuccess={() => router.refresh()}
      />
      {isEdit && (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="outline" className="ml-2 gap-1.5 text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          }
          title="Delete?"
          description={<>Delete <strong>{initial!.title}</strong>?</>}
          confirmLabel="Delete"
          successMessage="Deleted."
          onConfirm={async () => {
            const r = await fetch(`/api/admin/free-resources/${initial!.id}`, { method: 'DELETE' })
            const data = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(data.error || 'Failed.')
            router.refresh()
          }}
        />
      )}
    </>
  )
}
