import { PublicLayout } from '@/components/public/public-layout'

export default function PublicLayoutGroup({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>
}

// Public pages should be indexable
export const revalidate = 60  // ISR for public pages
