// MY CS MTP — helpers for the blog TOC and heading ids.

export interface TocItem {
  level: number
  text: string
  id: string
}

const HEADING_RE = /^(#{2,6})\s+(.+?)\s*$/

/** Extract h2–h6 headings from markdown content. */
export function extractToc(markdown: string): TocItem[] {
  const out: TocItem[] = []
  const lines = markdown.split('\n')
  for (const line of lines) {
    const m = HEADING_RE.exec(line)
    if (!m) continue
    const hashes = m[1]
    const text = m[2].replace(/[`*_]/g, '').trim()
    if (!text) continue
    out.push({
      level: hashes.length,
      text,
      id: slugifyHeading(text),
    })
  }
  return out
}

/** Make a URL-safe heading id (similar to GitHub's algorithm). */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/** Slugify markdown headings in-place by inserting html anchors before each h2–h6 line. */
export function injectHeadingIds(markdown: string): string {
  const lines = markdown.split('\n')
  const out: string[] = []
  for (const line of lines) {
    const m = HEADING_RE.exec(line)
    if (!m) {
      out.push(line)
      continue
    }
    const text = m[2].replace(/[`*_]/g, '').trim()
    const id = slugifyHeading(text)
    out.push(`<a id="${id}" />`)
    out.push(line)
  }
  return out.join('\n')
}
