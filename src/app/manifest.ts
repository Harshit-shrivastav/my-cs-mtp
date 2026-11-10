// MY CS MTP — PWA manifest at /manifest.webmanifest (Next.js 16 manifest.ts)
import type { MetadataRoute } from 'next'
import { getSettings } from '@/lib/settings'

export const revalidate = 3600

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings()
  const siteName = settings.siteName || 'MY CS MTP'
  const shortName = siteName.length > 12 ? 'MTP' : siteName
  const themeColor = settings.themeColor || '#000000'

  return {
    name: siteName,
    short_name: shortName,
    description:
      settings.tagline ||
      'Online test series for CS students — CSEET, Executive & Professional',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    categories: ['education', 'productivity'],
  }
}
