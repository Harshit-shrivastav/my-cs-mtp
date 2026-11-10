// MY CS MTP — Admin: edit an existing blog post.
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { BlogEditor, type BlogPostInitial } from '@/components/admin/blog-editor'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditBlogPostPage({ params }: PageProps) {
  const { id } = await params
  const post = await db.blogPost.findUnique({ where: { id } })
  if (!post) notFound()

  const initial: BlogPostInitial = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImageKey: post.coverImageKey,
    coverImageAlt: post.coverImageAlt,
    authorName: post.authorName,
    tags: post.tags,
    status: post.status,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    aiGenerated: post.aiGenerated,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    seoKeywords: post.seoKeywords,
    ogImageKey: post.ogImageKey,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  }

  return <BlogEditor initial={initial} />
}
