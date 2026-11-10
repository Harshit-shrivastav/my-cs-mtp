// MY CS MTP — Client-safe subset of @/lib/storage.
// storage.ts imports node builtins (fs/path) and the AWS SDK, so it cannot be
// bundled into client components. Client components (e.g. image-picker) should
// import publicUrl from here instead — same behaviour, no node builtins.

export function publicUrl(key: string): string | null {
  if (!key) return null
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL
  if (base) {
    return `${base.replace(/\/$/, '')}/${key}`
  }
  // local fallback — files uploaded via /api/storage/upload land in /public/uploads
  return `/uploads/${key}`
}

export const storageMode: 'r2' | 'local' = process.env.S3_ENDPOINT ? 'r2' : 'local'
