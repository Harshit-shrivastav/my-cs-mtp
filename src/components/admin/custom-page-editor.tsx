// MY CS MTP — Admin custom page editor (create + edit). Full-page client form
// with markdown live preview, header/footer visibility switches and SEO fields.
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/admin/form-field'
import { MarkdownEditor } from '@/components/admin/markdown-editor'
import { ImagePicker } from '@/components/admin/image-picker'
import { slugify } from '@/lib/utils-extra'
import { RESERVED_PAGE_SLUGS } from '@/lib/reserved-slugs'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save, ExternalLink } from 'lucide-react'

export interface CustomPageInitial {
  id: string
  title: string
  slug: string
  content: string
  showInHeader: boolean
  showInFooter: boolean
  isActive: boolean
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  ogImageKey: string | null
  createdAt: string
  updatedAt: string
}

export function CustomPageEditor({ initial }: { initial: CustomPageInitial | null }) {
  const router = useRouter()
  const isEdit = !!initial

  const [title, setTitle] = useState(initial?.title || '')
  const [slug, setSlug] = useState(initial?.slug || '')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [content, setContent] = useState(initial?.content || '')
  const [showInHeader, setShowInHeader] = useState(initial?.showInHeader ?? false)
  const [showInFooter, setShowInFooter] = useState(initial?.showInFooter ?? true)
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle || '')
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription || '')
  const [seoKeywords, setSeoKeywords] = useState(initial?.seoKeywords || '')
  const [ogImageKey, setOgImageKey] = useState(initial?.ogImageKey || '')
  const [busy, setBusy] = useState(false)

  const reservedNow = RESERVED_PAGE_SLUGS.includes(slug.trim().toLowerCase())

  function handleTitle(v: string) {
    setTitle(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  async function save() {
    if (!title.trim()) {
      toast.error('Title is required.')
      return
    }
    const finalSlug = slugify(slug)
    if (!finalSlug) {
      toast.error('Slug is required.')
      return
    }
    if (RESERVED_PAGE_SLUGS.includes(finalSlug.toLowerCase())) {
      toast.error('This slug is reserved.')
      return
    }
    if (!content.trim()) {
      toast.error('Content is required.')
      return
    }
    setBusy(true)
    try {
      const payload = {
        title: title.trim(),
        slug: finalSlug,
        content,
        showInHeader,
        showInFooter,
        isActive,
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
        seoKeywords: seoKeywords.trim() || null,
        ogImageKey: ogImageKey || null,
      }
      const r = isEdit
        ? await fetch(`/api/admin/custom-pages/${initial!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/custom-pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed to save.')
      if (isEdit) {
        if (data.slugChanged) {
          toast.success('Saved. A 301 redirect was created for the old URL.')
        } else {
          toast.success('Custom page saved.')
        }
        router.refresh()
      } else {
        toast.success('Custom page created.')
        router.push(`/admin/custom-pages/${data.page.id}`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setBusy(false)
    }
  }

  const saveButtons = (
    <>
      <Button onClick={save} disabled={busy} className="gap-1.5">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {isEdit ? 'Save changes' : 'Create page'}
      </Button>
      <Button asChild variant="outline" disabled={busy}>
        <Link href="/admin/custom-pages">Cancel</Link>
      </Button>
    </>
  )

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <Button asChild size="sm" variant="ghost" className="mb-2 gap-1 text-muted-foreground">
          <Link href="/admin/custom-pages">
            <ArrowLeft className="h-4 w-4" />
            Back to custom pages
          </Link>
        </Button>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {isEdit ? 'Edit custom page' : 'New custom page'}
              </h2>
              {isActive ? (
                <Badge variant="outline" className="gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEdit ? (
                <span className="font-mono">/{initial!.slug}</span>
              ) : (
                'Standalone pages like Terms, Privacy Policy or FAQs — rendered at /{slug}.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isEdit && isActive && (
              <Button asChild size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
                <a href={`/${initial!.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  View public page
                </a>
              </Button>
            )}
            {saveButtons}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left: content */}
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField id="cp-title" label="Title" required>
                <Input
                  id="cp-title"
                  value={title}
                  onChange={(e) => handleTitle(e.target.value)}
                  placeholder="e.g. Privacy Policy"
                  maxLength={300}
                />
              </FormField>
              <FormField
                id="cp-slug"
                label="Slug"
                required
                error={reservedNow ? 'This slug is reserved — choose another.' : null}
                helpText={
                  isEdit && slug !== initial?.slug
                    ? 'Changing the slug creates a 301 redirect from the old URL.'
                    : 'Public URL: /{slug} — auto-generated from the title, editable.'
                }
              >
                <Input
                  id="cp-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setSlug(e.target.value)
                  }}
                  placeholder="privacy-policy"
                  className="font-mono"
                />
              </FormField>
              <FormField id="cp-content" label="Content (markdown)" required full>
                <MarkdownEditor
                  id="cp-content"
                  value={content}
                  onChange={setContent}
                  placeholder={'## About this page\n\nWrite the page content in markdown…'}
                  minHeight={400}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">SEO</CardTitle>
              <CardDescription>Search engine metadata for this page.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField id="cp-seo-title" label="SEO title" full>
                <Input
                  id="cp-seo-title"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Defaults to the page title"
                />
              </FormField>
              <FormField id="cp-seo-description" label="SEO description" full>
                <Textarea
                  id="cp-seo-description"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Meta description (~150 characters)"
                  rows={2}
                />
              </FormField>
              <FormField id="cp-seo-keywords" label="SEO keywords">
                <Input
                  id="cp-seo-keywords"
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  placeholder="comma-separated"
                />
              </FormField>
              <FormField id="cp-og-image" label="OG image" helpText="Social share image.">
                <ImagePicker
                  keyPrefix="seo/custom-pages"
                  initialKey={ogImageKey || null}
                  onChange={(key) => setOgImageKey(key)}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>

        {/* Right: visibility sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Visibility</CardTitle>
              <CardDescription>Where this page appears on the public site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="cp-active">Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive pages return 404 publicly.</p>
                </div>
                <Switch id="cp-active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t pt-4">
                <div>
                  <Label htmlFor="cp-header">Show in header</Label>
                  <p className="text-xs text-muted-foreground">Adds a link in the site header menu.</p>
                </div>
                <Switch id="cp-header" checked={showInHeader} onCheckedChange={setShowInHeader} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t pt-4">
                <div>
                  <Label htmlFor="cp-footer">Show in footer</Label>
                  <p className="text-xs text-muted-foreground">Adds a link in the footer menu.</p>
                </div>
                <Switch id="cp-footer" checked={showInFooter} onCheckedChange={setShowInFooter} />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">{saveButtons}</div>
        </div>
      </div>
    </div>
  )
}
