// MY CS MTP — Student free-content page.
import { db } from '@/lib/db'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, Sparkles, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FreeContentPage() {
  const resources = await db.freeResource.findMany({
    where: { isActive: true, isPublic: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: { course: { select: { name: true } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Free content</h2>
        <p className="text-sm text-muted-foreground">
          Curated free resources — sample papers, mock tests and study notes.
        </p>
      </div>

      {resources.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No free content available right now.</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              We publish free samples regularly. Please check back soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{r.title}</CardTitle>
                    {r.course && (
                      <CardDescription className="mt-0.5">{r.course.name}</CardDescription>
                    )}
                  </div>
                  <Sparkles className="h-4 w-4 text-foreground shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {r.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{r.description}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-[10px]">Free</Badge>
                  {r.fileKey ? (
                    <a
                      href={`/api/download?context=free&freeId=${r.id}&key=${encodeURIComponent(r.fileKey)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-muted-foreground opacity-60">
                      <ExternalLink className="h-3.5 w-3.5" /> No file
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
