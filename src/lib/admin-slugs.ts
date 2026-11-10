// MY CS MTP — Shared helpers for admin modules that manage slugs
// (blog posts, custom pages). Unique-slug collision handling mirrors the
// courses API pattern (-1, -2, … suffix), plus Redirect maintenance for
// slug changes (301s).
// NOTE: imports the database — server-only. For the reserved-slug list see
// src/lib/reserved-slugs.ts (pure, client-safe).

import { db } from '@/lib/db'

/**
 * Returns `base` if unique within the given table, otherwise appends
 * -1, -2, … until a free slug is found (same behaviour as courses).
 */
export async function uniqueModelSlug(
  model: 'blogPost' | 'customPage',
  base: string,
  excludeId?: string
): Promise<string> {
  const taken = async (slug: string): Promise<boolean> => {
    if (model === 'blogPost') {
      const row = await db.blogPost.findFirst({
        where: excludeId ? { slug, NOT: { id: excludeId } } : { slug },
        select: { id: true },
      })
      return !!row
    }
    const row = await db.customPage.findFirst({
      where: excludeId ? { slug, NOT: { id: excludeId } } : { slug },
      select: { id: true },
    })
    return !!row
  }

  if (!(await taken(base))) return base
  let i = 1
  while (true) {
    const cand = `${base}-${i}`
    if (!(await taken(cand))) return cand
    i++
  }
}

/**
 * After a slug change, maintain the Redirect table:
 *  1. Delete any redirect that points away from the NEW path (prevents loops —
 *     the content now lives at the new path).
 *  2. Upsert a permanent redirect old → new.
 *  3. Re-point older redirects that targeted the OLD path straight to the NEW
 *     path (avoids redirect chains).
 */
export async function maintainSlugRedirects(oldPath: string, newPath: string): Promise<void> {
  if (oldPath === newPath) return
  // 1. The new path is live content now — drop any stale redirect from it.
  await db.redirect.deleteMany({ where: { fromPath: newPath } })
  // 3. Flatten chains: anything pointing at the old path goes to the new one.
  await db.redirect.updateMany({
    where: { toPath: oldPath },
    data: { toPath: newPath },
  })
  // 2. Upsert the redirect for the old path.
  await db.redirect.upsert({
    where: { fromPath: oldPath },
    update: { toPath: newPath, isPermanent: true },
    create: { fromPath: oldPath, toPath: newPath, isPermanent: true },
  })
}
