// MY CS MTP — Admin courses list + CRUD.
import { db } from '@/lib/db'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AdminSearch } from '@/components/admin/admin-search'
import { PaginationControls } from '@/components/admin/pagination-controls'
import { CrudActions, CrudDelete } from '@/components/admin/crud-actions'
import { Suspense } from 'react'
import { CourseListActions } from '@/components/admin/courses-actions'
import { publicUrl } from '@/lib/storage'
import Image from 'next/image'
import { BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

const COURSE_FIELDS = [
  { name: 'name', label: 'Name', type: 'text' as const, required: true, placeholder: 'e.g. CSEET' },
  { name: 'slug', label: 'Slug', type: 'text' as const, required: true, placeholder: 'auto-generated', autoSlugFrom: 'name' },
  { name: 'description', label: 'Description', type: 'textarea' as const, placeholder: 'Short course description' },
  { name: 'imageKey', label: 'Image', type: 'image' as const, keyPrefix: 'courses', helpText: 'JPG, PNG, or WEBP — up to 5 MB.' },
  { name: 'imageAlt', label: 'Image alt text', type: 'text' as const, placeholder: 'e.g. CSEET Test Series cover' },
  { name: 'isActive', label: 'Active', type: 'switch' as const },
  { name: 'sortOrder', label: 'Sort order', type: 'number' as const, min: '0', step: '1', placeholder: '0' },
  { name: 'seoTitle', label: 'SEO title', type: 'text' as const },
  { name: 'seoDescription', label: 'SEO description', type: 'textarea' as const },
  { name: 'seoKeywords', label: 'SEO keywords', type: 'text' as const, placeholder: 'comma-separated' },
  { name: 'ogImageKey', label: 'OG image', type: 'image' as const, keyPrefix: 'seo/courses' },
]

interface PageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}

export default async function AdminCoursesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const pageRaw = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const [total, rows] = await Promise.all([
    db.course.count({
      where: q ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] } : {},
    }),
    db.course.findMany({
      where: q ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] } : {},
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageKey: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
        _count: { select: { plans: true, subjects: true, papers: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Courses</h2>
        <p className="text-sm text-muted-foreground">Manage course catalogue.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All courses</CardTitle>
          <CardDescription>{total} total · showing page {page} of {totalPages}.</CardDescription>
          <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <Suspense fallback={<div className="h-9 w-72 rounded-md bg-muted/40" />}>
              <AdminSearch placeholder="Search by name or slug…" />
            </Suspense>
            <CrudActions
              endpoint="/api/admin/courses"
              fields={COURSE_FIELDS}
              title="Create course"
              description="Add a new course to the catalogue."
              submitLabel="Create course"
            />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No courses found.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create your first course to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Plans</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sort</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {c.imageKey ? (
                          <Image
                            src={publicUrl(c.imageKey) || ''}
                            alt={c.name}
                            width={36}
                            height={36}
                            className="h-9 w-9 rounded-md object-cover border"
                            unoptimized
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium leading-tight">{c.name}</div>
                          {c.description && <div className="text-xs text-muted-foreground line-clamp-1 max-w-[16rem]">{c.description}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
                    <TableCell className="tabular-nums">{c._count.plans}</TableCell>
                    <TableCell className="tabular-nums">{c._count.subjects}</TableCell>
                    <TableCell>
                      {c.isActive ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.sortOrder}</TableCell>
                    <TableCell className="text-right">
                      <CourseListActions course={c} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <PaginationControls page={page} totalPages={totalPages} />
        </CardContent>
      </Card>
    </div>
  )
}
