// MY CS MTP — Student mentorship page: request form + list of my requests.
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/server-auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import MentorshipRequestForm from '@/components/dashboard/mentorship-request-form'
import { CalendarClock, MessageSquare } from 'lucide-react'
import type { MentorshipStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function MentorshipPage() {
  const authed = await getCurrentUser()
  if (!authed) return null

  const requests = await db.mentorship.findMany({
    where: { studentId: authed.id },
    orderBy: { requestedAt: 'desc' },
    select: {
      id: true,
      topic: true,
      notes: true,
      mentorName: true,
      status: true,
      requestedAt: true,
      updatedAt: true,
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Mentorship</h2>
        <p className="text-sm text-muted-foreground">
          Book a one-on-one session with our All India Ranker mentors.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-foreground" />
              <CardTitle className="text-base">Request a session</CardTitle>
            </div>
            <CardDescription>
              Tell us what you want to discuss. Our team will reach out to schedule a slot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MentorshipRequestForm />
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My requests</CardTitle>
            <CardDescription>{requests.length} request{requests.length !== 1 ? 's' : ''} total.</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                You haven&apos;t requested a mentorship session yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {requests.map((r) => (
                  <li key={r.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium">{r.topic}</h4>
                      <MentorshipStatusBadge status={r.status} />
                    </div>
                    {r.mentorName && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Mentor: <span className="text-foreground font-medium">{r.mentorName}</span>
                      </p>
                    )}
                    {r.notes && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <p className="whitespace-pre-line line-clamp-4">{r.notes}</p>
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Requested on {r.requestedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MentorshipStatusBadge({ status }: { status: MentorshipStatus }) {
  const map: Record<MentorshipStatus, { label: string; color: string }> = {
    REQUESTED: { label: 'Requested', color: 'bg-blue-100 text-blue-700' },
    ASSIGNED: { label: 'Mentor assigned', color: 'bg-amber-100 text-amber-800' },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
    CANCELLED: { label: 'Cancelled', color: 'bg-rose-100 text-rose-700' },
  }
  const { label, color } = map[status]
  return <Badge variant="secondary" className={`text-[10px] ${color}`}>{label}</Badge>
}
