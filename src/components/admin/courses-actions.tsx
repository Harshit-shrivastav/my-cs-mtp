'use client'

import { CrudActions, CrudDelete } from '@/components/admin/crud-actions'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const COURSE_FIELDS = [
  { name: 'name', label: 'Name', type: 'text' as const, required: true, placeholder: 'e.g. CSEET' },
  { name: 'slug', label: 'Slug', type: 'text' as const, required: true, placeholder: 'auto-generated' },
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

export function CourseListActions({
  course,
}: {
  course: { id: string; name: string; slug: string; description: string | null; imageKey: string | null; imageAlt: string | null; isActive: boolean; sortOrder: number }
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <CrudActions
        endpoint="/api/admin/courses"
        fields={COURSE_FIELDS}
        title="Edit course"
        description={course.name}
        initial={course}
        submitLabel="Save changes"
      />
      <CrudDelete
        endpoint="/api/admin/courses"
        id={course.id}
        label="Delete"
        description={<>Delete <strong>{course.name}</strong>? This will permanently remove the course and cascade-delete all related plans, subjects, papers, schedules, notes, and misc files. This action cannot be undone.</>}
      />
    </div>
  )
}
