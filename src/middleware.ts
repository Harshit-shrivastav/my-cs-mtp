// MY CS MTP — Middleware: 301 redirects from Redirect table + security headers.
// - On every request, check the path against db.Redirect rows (60s cached).
// - In production: normalize www -> non-www and strip trailing slashes (except root).
// - Set security headers (HSTS, X-Content-Type-Options, CSP, etc.) on all responses.
// - Add X-Robots-Tag: noindex, nofollow on private paths (/admin, /dashboard, etc.).
// - Never redirect /api/* or static assets.
//
// Note: Next.js middleware runs on the Edge Runtime, which cannot use Prisma
// directly. We fetch redirects from our own /api/internal/redirects endpoint
// (excluded from the middleware matcher) instead.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: [
    // Skip Next internals, uploaded files served from /public/uploads, and our
    // internal API used by this middleware itself (avoids a fetch loop).
    '/((?!_next/static|_next/image|uploads|api/internal).*)',
  ],
}

// ---- In-memory redirect cache (60s TTL) ----
interface RedirectRow { fromPath: string; toPath: string; isPermanent: boolean }
let redirectCache: { data: RedirectRow[]; at: number } | null = null
const REDIRECT_TTL = 60_000 // 60 seconds

async function loadRedirects(req: NextRequest): Promise<RedirectRow[]> {
  if (redirectCache && Date.now() - redirectCache.at < REDIRECT_TTL) {
    return redirectCache.data
  }
  try {
    // Call our own internal endpoint. Use the same host so Caddy / local dev
    // resolve to the same app. We use a relative URL via req.nextUrl.origin.
    const origin = req.nextUrl.origin
    const r = await fetch(`${origin}/api/internal/redirects`, {
      // Don't follow redirects (we don't expect any) and keep it short.
      redirect: 'manual',
      // @ts-ignore - signal is supported in fetch on the edge runtime
      signal: AbortSignal.timeout(2000),
    })
    if (r.ok) {
      const json = (await r.json()) as { rows: RedirectRow[] }
      redirectCache = { data: json.rows || [], at: Date.now() }
      return redirectCache.data
    }
    throw new Error('redirects endpoint returned ' + r.status)
  } catch (e) {
    console.error('middleware: failed to load redirects', e)
    // Don't crash requests — just behave as if no redirects exist for a bit.
    redirectCache = { data: [], at: Date.now() }
    return redirectCache.data
  }
}

// ---- Paths we never redirect (besides /api and static assets already excluded) ----
function isApiOrAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads')
  )
}

// ---- Private paths that should get X-Robots-Tag: noindex, nofollow ----
const NOINDEX_PREFIXES = [
  '/admin',
  '/dashboard',
  '/examiner',
  '/cart',
  '/login',
  '/signup',
  '/payment',
  '/payment-success',
  '/payment-failed',
  '/verify',
  '/forgot-password',
  '/reset-password',
]

function isNoindexPath(pathname: string): boolean {
  return NOINDEX_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

// ---- Security headers applied to all responses ----
const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.cashfree.com",
    "frame-src https://checkout.razorpay.com https://*.cashfree.com",
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "connect-src 'self' https://*.razorpay.com https://api.cashfree.com https://sandbox.cashfree.com",
  ].join('; '),
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ---- Redirects from db ----
  if (!isApiOrAsset(pathname)) {
    const redirects = await loadRedirects(req)
    if (redirects.length) {
      const match = redirects.find((r) => r.fromPath === pathname)
      if (match) {
        const target = req.nextUrl.clone()
        target.pathname = match.toPath
        const status = match.isPermanent === false ? 302 : 301
        const res = NextResponse.redirect(target, status)
        applySecurityHeaders(res, pathname)
        return res
      }
    }
  }

  // ---- www -> non-www + trailing slash normalization (production only) ----
  if (process.env.NODE_ENV === 'production' && !isApiOrAsset(pathname)) {
    const host = req.headers.get('host') || ''
    const isWww = host.startsWith('www.')

    // Strip trailing slash except for the root path "/"
    const hasTrailingSlash = pathname.length > 1 && pathname.endsWith('/')
    const normalizedPath = hasTrailingSlash ? pathname.replace(/\/$/, '') : pathname

    if (isWww || hasTrailingSlash) {
      const target = req.nextUrl.clone()
      if (isWww) {
        target.host = host.replace(/^www\./, '')
      }
      target.pathname = normalizedPath
      const res = NextResponse.redirect(target, 301)
      applySecurityHeaders(res, pathname)
      return res
    }
  }

  // ---- Build the response and apply security headers ----
  const res = NextResponse.next()
  applySecurityHeaders(res, pathname)
  return res
}

function applySecurityHeaders(res: NextResponse, pathname: string) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v)
  }
  if (isNoindexPath(pathname)) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
}
