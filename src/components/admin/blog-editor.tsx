// MY CS MTP — Admin blog post editor (create + edit). Full-page client form
// with markdown live preview, AI draft generation, cover image upload and
// per-post SEO fields.
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
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/admin/form-field'
import { MarkdownEditor } from '@/components/admin/markdown-editor'
import { ImagePicker } from '@/components/admin/image-picker'
import { slugify } from '@/lib/utils-extra'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  Save,
  Sparkles,
  ExternalLink,
  Wand2,
} from 'lucide-react'

export interface BlogPostInitial {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  coverImageKey: string | null
  coverImageAlt: string | null
  authorName: string | null
  tags: string | null
  status: 'DRAFT' | 'PUBLISHED'
  publishedAt: string | null
  aiGenerated: boolean
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  ogImageKey: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft — not visible publicly' },
  { value: 'PUBLISHED', label: 'Published — live at /blog/{slug}' },
]

export function BlogEditor({ initial }: { initial: BlogPostInitial | null }) {
  const router = useRouter()
  const isEdit = !!initial

  const [title, setTitle] = useState(initial?.title || '')
  const [slug, setSlug] = useState(initial?.slug || '')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [excerpt, setExcerpt] = useState(initial?.excerpt || '')
  const [content, setContent] = useState(initial?.content || '')
  const [coverImageKey, setCoverImageKey] = useState(initial?.coverImageKey || '')
  const [coverImageAlt, setCoverImageAlt] = useState(initial?.coverImageAlt || '')
  const [authorName, setAuthorName] = useState(initial?.authorName || '')
  const [tags, setTags] = useState(initial?.tags || '')
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>(initial?.status || 'DRAFT')
  const [aiGenerated, setAiGenerated] = useState(initial?.aiGenerated || false)
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle || '')
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription || '')
  const [seoKeywords, setSeoKeywords] = useState(initial?.seoKeywords || '')
  const [ogImageKey, setOgImageKey] = useState(initial?.ogImageKey || '')

  // AI generate
  const [aiTitle, setAiTitle] = useState(initial?.title || '')
  const [aiBusy, setAiBusy] = useState(false)

  // Save
  const [busy, setBusy] = useState(false)

  function handleTitle(v: string) {
    setTitle(v)
    if (!slugTouched) setSlug(slugify(v))
    if (!aiTitle || aiTitle === title) setAiTitle(v)
  }

  async function generateDraft() {
    const t = aiTitle.trim()
    if (!t) {
      toast.error('Enter a title to generate a draft for.')
      return
    }
    setAiBusy(true)
    try {
      const r = await fetch('/api/admin/blog/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'AI generation failed.')
      setContent(data.content || '')
      if (!excerpt.trim() && data.excerpt) setExcerpt(data.excerpt)
      if (!title.trim()) handleTitle(t)
      setAiGenerated(true)
      toast.success('Draft generated. Review and edit before publishing.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI generation failed.')
    } finally {
      setAiBusy(false)
    }
  }

  async function save() {
    if (!title.trim()) {
      toast.error('Title is required.')
      return
    }
    if (!content.trim()) {
      toast.error('Content is required.')
      return
    }
    const finalSlug = slugify(slug) || slugify(title)
    if (!finalSlug) {
      toast.error('Slug is required.')
      return
    }
    setBusy(true)
    try {
      const payload = {
        title: title.trim(),
        slug: finalSlug,
        excerpt: excerpt.trim() || null,
        content,
        coverImageKey: coverImageKey || null,
        coverImageAlt: coverImageAlt.trim() || null,
        authorName: authorName.trim() || null,
        tags: tags.trim() || null,
        status,
        aiGenerated,
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
        seoKeywords: seoKeywords.trim() || null,
        ogImageKey: ogImageKey || null,
      }
      const r = isEdit
        ? await fetch(`/api/admin/blog/${initial!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/blog', {
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
          toast.success('Blog post saved.')
        }
        router.refresh()
      } else {
        toast.success('Blog post created.')
        router.push(`/admin/blog/${data.post.id}`)
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
        {isEdit ? 'Save changes' : 'Create post'}
      </Button>
      <Button asChild variant="outline" disabled={busy}>
        <Link href="/admin/blog">Cancel</Link>
      </Button>
    </>
  )

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <Button asChild size="sm" variant="ghost" className="mb-2 gap-1 text-muted-foreground">
          <Link href="/admin/blog">
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>
        </Button>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {isEdit ? 'Edit post' : 'New blog post'}
              </h2>
              {aiGenerated && (
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI draft
                </Badge>
              )}
              {status === 'PUBLISHED' ? (
                <Badge variant="outline" className="gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Published
                </Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEdit ? (
                <>
                  <span className="font-mono">/blog/{initial!.slug}</span>
                  {initial!.publishedAt && (
                    <> · published {new Date(initial!.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                  )}
                </>
              ) : (
                'Fill in the details below — you can generate the first draft with AI.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isEdit && status === 'PUBLISHED' && (
              <Button asChild size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
                <a href={`/blog/${initial!.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  View public page
                </a>
              </Button>
            )}
            {saveButtons}
          </div>
        </div>
      </div>

      {/* AI generate card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Generate draft from title
          </CardTitle>
          <CardDescription>
            Uses the AI provider configured in Admin → AI Config. The generated markdown is
            filled into the content editor below — always review before publishing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={aiTitle}
              onChange={(e) => setAiTitle(e.target.value)}
              placeholder="e.g. How to prepare for CSEET in 30 days"
              aria-label="Title to generate a draft for"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void generateDraft()
                }
              }}
            />
            <Button onClick={generateDraft} disabled={aiBusy} className="gap-1.5 self-start sm:self-auto">
              {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiBusy ? 'Generating… (can take up to a minute)' : 'Generate draft'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left: content */}
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField id="blog-title" label="Title" required>
                <Input
                  id="blog-title"
                  value={title}
                  onChange={(e) => handleTitle(e.target.value)}
                  placeholder="Post title"
                  maxLength={300}
                />
              </FormField>
              <FormField
                id="blog-slug"
                label="Slug"
                required
                helpText={isEdit && slug !== initial?.slug ? 'Changing the slug creates a 301 redirect from the old URL.' : 'URL: /blog/{slug} — auto-generated from the title, editable.'}
              >
                <Input
                  id="blog-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setSlug(e.target.value)
                  }}
                  placeholder="auto-generated-from-title"
                  className="font-mono"
                />
              </FormField>
              <FormField id="blog-excerpt" label="Excerpt" helpText="Short summary shown on blog listing pages.">
                <Textarea
                  id="blog-excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="One or two sentences summarising the post…"
                  rows={3}
                />
              </FormField>
              <FormField id="blog-content" label="Content (markdown)" required full>
                <MarkdownEditor
                  id="blog-content"
                  value={content}
                  onChange={setContent}
                  placeholder={'# Introduction\n\nWrite the post in markdown — use ## section headings…'}
                  minHeight={400}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">SEO</CardTitle>
              <CardDescription>Per-post search engine metadata.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField id="blog-seo-title" label="SEO title" full>
                <Input
                  id="blog-seo-title"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Defaults to the post title"
                />
              </FormField>
              <FormField id="blog-seo-description" label="SEO description" full>
                <Textarea
                  id="blog-seo-description"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Meta description (~150 characters)"
                  rows={2}
                />
              </FormField>
              <FormField id="blog-seo-keywords" label="SEO keywords">
                <Input
                  id="blog-seo-keywords"
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  placeholder="comma-separated"
                />
              </FormField>
              <FormField id="blog-og-image" label="OG image" helpText="Social share image.">
                <ImagePicker
                  keyPrefix="seo/blog"
                  initialKey={ogImageKey || null}
                  onChange={(key) => setOgImageKey(key)}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>

        {/* Right: meta sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField id="blog-status" label="Status" helpText="Switching to Published stamps the publish date on first publish.">
                <select
                  id="blog-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT')}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="blog-author" label="Author name">
                <Input
                  id="blog-author"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. MY CS MTP Team"
                  maxLength={120}
                />
              </FormField>
              <FormField id="blog-tags" label="Tags" helpText="Comma-separated, e.g. cseet, exam-tips.">
                <Input
                  id="blog-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="cseet, preparation, tips"
                  maxLength={300}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cover image</CardTitle>
              <CardDescription>Shown on the blog listing and post header.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField id="blog-cover" label="Cover image">
                <ImagePicker
                  keyPrefix="blog"
                  initialKey={coverImageKey || null}
                  onChange={(key) => setCoverImageKey(key)}
                />
              </FormField>
              <FormField id="blog-cover-alt" label="Cover image alt text">
                <Input
                  id="blog-cover-alt"
                  value={coverImageAlt}
                  onChange={(e) => setCoverImageAlt(e.target.value)}
                  placeholder="Describe the image for screen readers"
                  maxLength={300}
                />
              </FormField>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">{saveButtons}</div>
        </div>
      </div>
    </div>
  )
}
