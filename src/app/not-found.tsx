// MY CS MTP — Custom 404 page.
// Rendered inside the public layout so users keep the header/footer.
// Calls next/navigation's notFound() in code paths, but for an actual 404
// Next.js renders this file at the root (it must be at src/app/not-found.tsx).
import Link from 'next/link'
import { PublicLayout } from '@/components/public/public-layout'
import { Button } from '@/components/ui/button'
import { Home, Tag, BookOpen, MessageCircle } from 'lucide-react'

export const dynamic = 'force-static'

export default function NotFound() {
  return (
    <PublicLayout>
      <section className="container mx-auto px-4 py-20 max-w-3xl text-center flex-1 flex flex-col items-center justify-center">
        <p className="text-7xl sm:text-8xl font-bold tracking-tight text-foreground">404</p>
        <h1 className="mt-4 text-2xl sm:text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted-foreground max-w-md">
          Sorry, the page you are looking for doesn’t exist or may have been moved.
          Try one of the links below to get back on track.
        </p>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl">
          <Button asChild variant="outline">
            <Link href="/" className="flex flex-col items-center gap-1 py-3">
              <Home className="h-5 w-5" />
              <span className="text-xs">Home</span>
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/pricing" className="flex flex-col items-center gap-1 py-3">
              <Tag className="h-5 w-5" />
              <span className="text-xs">Pricing</span>
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/blog" className="flex flex-col items-center gap-1 py-3">
              <BookOpen className="h-5 w-5" />
              <span className="text-xs">Blog</span>
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact" className="flex flex-col items-center gap-1 py-3">
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs">Contact</span>
            </Link>
          </Button>
        </div>

        <div className="mt-10">
          <Button asChild>
            <Link href="/">Go back home</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  )
}
