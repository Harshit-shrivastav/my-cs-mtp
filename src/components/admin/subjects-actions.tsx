'use client'

import { CrudActions, CrudDelete } from '@/components/admin/crud-actions'

const SUBJECT_FIELDS = (courses: { id: string; name: string }[]) => [
  { name: 'name', label: 'Name', type: 'text' as const, required: true, placeholder: 'e.g. Business Communication' },
  { name: 'slug', label: 'Slug', type: 'text' as const, required: true, placeholder: 'auto-generated', autoSlugFrom: 'name' },
  { name: 'courseId', label: 'Course', type: 'select' as const, required: true, options: courses.map((c) => ({ value: c.id, label: c.name })), selectPlaceholder: 'Select course' },
  { name: 'description', label: 'Description', type: 'textarea' as const },
  { name: 'isActive', label: 'Active', type: 'switch' as const },
  { name: 'sortOrder', label: 'Sort order', type: 'number' as const, min: '0', step: '1', placeholder: '0' },
]

export function SubjectListActions({
  courses,
  initial,
}: {
  courses: { id: string; name: string }[]
  initial: { id: string; name: string; slug: string; courseId: string; description: string | null; isActive: boolean; sortOrder: number } | null
}) {
  if (!initial) {
    return (
      <CrudActions
        endpoint="/api/admin/subjects"
        fields={SUBJECT_FIELDS(courses)}
        title="Create subject"
        description="Add a new subject to the catalogue."
        submitLabel="Create subject"
      />
    )
  }
  return (
    <div className="flex items-center justify-end gap-2">
      <CrudActions
        endpoint="/api/admin/subjects"
        fields={SUBJECT_FIELDS(courses)}
        title="Edit subject"
        description={initial.name}
        initial={initial}
        submitLabel="Save changes"
      />
      <CrudDelete
        endpoint="/api/admin/subjects"
        id={initial.id}
        description={<>Delete <strong>{initial.name}</strong>? This will cascade-delete related papers.</>}
      />
    </div>
  )
}
