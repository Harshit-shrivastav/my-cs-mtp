// MY CS MTP — Admin: create a new blog post.
import { BlogEditor } from '@/components/admin/blog-editor'

export const dynamic = 'force-dynamic'

export default function NewBlogPostPage() {
  return <BlogEditor initial={null} />
}
