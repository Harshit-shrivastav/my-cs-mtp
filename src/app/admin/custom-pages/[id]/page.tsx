// MY CS MTP — Admin: edit an existing custom page.
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { CustomPageEditor, type CustomPageInitial } from '@/components/admin/custom-page-editor'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCustomPagePage({ params }: PageProps) {
  const { id } = await params
  const page = await db.customPage.findUnique({ where: { id } })
  if (!page) notFound()

  const initial: CustomPageInitial = {
    id: page.id,
    title: page.title,
    slug: page.slug,
    content: page.content,
    showInHeader: page.showInHeader,
    showInFooter: page.showInFooter,
    isActive: page.isActive,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    seoKeywords: page.seoKeywords,
    ogImageKey: page.ogImageKey,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  }

  return <CustomPageEditor initial={initial} />
}
