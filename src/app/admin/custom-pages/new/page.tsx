// MY CS MTP — Admin: create a new custom page.
import { CustomPageEditor } from '@/components/admin/custom-page-editor'

export const dynamic = 'force-dynamic'

export default function NewCustomPagePage() {
  return <CustomPageEditor initial={null} />
}
