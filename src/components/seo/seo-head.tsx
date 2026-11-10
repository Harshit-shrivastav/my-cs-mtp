// MY CS MTP — Shared SEO head component.
// A server component that renders a JSON-LD <script> block for structured data.
// Most pages will inline their own metadata, but this is a useful helper for
// pages that want to keep their JSON-LD declaration next to the rendered content.
import { absUrl } from '@/components/public/seo'

export interface SeoHeadProps {
  title?: string
  description?: string
  image?: string
  canonicalPath?: string
  jsonLd?: object | object[]
}

/**
 * Server component that renders an application/ld+json script.
 * Does NOT set <title>/<meta> — use Next.js generateMetadata for that.
 */
export function SeoHead({ jsonLd }: SeoHeadProps) {
  if (!jsonLd) return null
  const data = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
  return (
    <>
      {data.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
    </>
  )
}

export { absUrl }
