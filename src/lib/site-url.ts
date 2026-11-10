// MY CS MTP — Shared site base URL helper.
// Derives the real public URL of the site from (1) the SITE_URL env override,
// (2) the incoming request's forwarded host/proto headers (so it works behind
// proxies like Caddy without hard-coding localhost), or (3) a localhost fallback.

import { headers } from 'next/headers'

export async function siteBaseUrl(req?: Request): Promise<string> {
  // 1. Explicit env override always wins
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '')

  // 2. Derive from request headers
  let host: string | null = null
  let proto = 'https'

  if (req) {
    // Route handler — read from the Request directly
    host = req.headers.get('x-forwarded-host') || req.headers.get('host')
    const xfp = req.headers.get('x-forwarded-proto')
    if (xfp) proto = xfp.split(',')[0].trim()
  } else {
    // Server component / metadata file — use next/headers
    try {
      const h = await headers()
      host = h.get('x-forwarded-host') || h.get('host')
      const xfp = h.get('x-forwarded-proto')
      if (xfp) proto = xfp.split(',')[0].trim()
    } catch {
      // headers() not available in this context — fall through
    }
  }

  if (host) {
    // Localhost is http; everything else is https behind the gateway
    if (host.startsWith('localhost') || host.startsWith('127.')) proto = 'http'
    return `${proto}://${host}`
  }

  // 3. Fallback for environments without request headers
  return 'http://localhost:3000'
}
