import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { getSettings } from "@/lib/settings";
import { siteBaseUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  const siteName = s.siteName || 'MY CS MTP'
  const url = await siteBaseUrl()
  return {
    metadataBase: new URL(url),
    title: {
      default: `${siteName} — CS Test Series for CSEET, Executive & Professional`,
      template: `%s | ${siteName}`,
    },
    description: s.tagline,
    keywords: ['CS test series', 'CSEET test series', 'CS Executive test series', 'CS Professional test series', 'Company Secretary', 'ICSI', 'mock test', siteName],
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    applicationName: siteName,
    category: 'Education',
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      siteName,
      locale: 'en_IN',
      url,
      title: `${siteName} — CS Test Series for CSEET, Executive & Professional`,
      description: s.tagline,
      images: s.ogImageKey
        ? [{ url: `/api/storage/download?key=${encodeURIComponent(s.ogImageKey)}`, width: 1200, height: 630, alt: siteName }]
        : [{ url: '/og-default.png', width: 1200, height: 630, alt: siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${siteName} — CS Test Series`,
      description: s.tagline,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    icons: s.faviconKey
      ? { icon: `/api/storage/download?key=${encodeURIComponent(s.faviconKey)}`, apple: `/api/storage/download?key=${encodeURIComponent(s.faviconKey)}` }
      : { icon: '/favicon.svg', apple: '/favicon.svg' },
    manifest: '/manifest.webmanifest',
  };
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
