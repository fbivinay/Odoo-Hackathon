import { Link } from 'react-router-dom'
import { CalendarDays, CalendarRange, Users } from 'lucide-react'
import { LeaveStatusPill, LeaveTypePill } from '@/components/StatusPill'
import { KpiCard } from '@/components/tremor/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, toISODate } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import type { AdminAttendanceRow, AdminLeaveRow, Employee } from '@/types'

export function AdminDashboard() {
  const roster = useApi<Employee[]>('/admin/employees')
  const pendingLeave = useApi<AdminLeaveRow[]>('/admin/leave?status=PENDING')
  const today = useApi<AdminAttendanceRow[]>(`/admin/attendance?date=${toISODate(new Date())}`)

  const presentToday = (today.data ?? []).filter((r) => r.checkIn).length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total employees" value={(roster.data ?? []).length} loading={roster.loading} />
        <KpiCard label="Present today" value={presentToday} loading={today.loading} hint="Checked in" />
        <KpiCard
          label="Leave pending"
          value={(pendingLeave.data ?? []).length}
          loading={pendingLeave.loading}
          hint="Awaiting a decision"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Pending approvals</CardTitle>
            <Link to="/admin/leave" className="text-xs font-medium text-indigo-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {pendingLeave.loading ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (pendingLeave.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Queue is clear.</p>
            ) : (
              <ul className="divide-y divide-border">
                {(pendingLeave.data ?? []).slice(0, 5).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm">
                        {l.employee.name} <LeaveTypePill type={l.type} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(l.startDate)} – {formatDate(l.endDate)}
                      </p>
                    </div>
                    <LeaveStatusPill status={l.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Link
            to="/admin/employees"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
          >
            <div className="rounded-md bg-indigo-50 p-2 text-indigo-600">
              <Users className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Employees</p>
              <p className="text-xs text-muted-foreground">Search, view, and edit records</p>
            </div>
          </Link>
          <Link
            to="/admin/attendance"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
          >
            <div className="rounded-md bg-indigo-50 p-2 text-indigo-600">
              <CalendarDays className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Attendance</p>
              <p className="text-xs text-muted-foreground">All employees, one day at a time</p>
            </div>
          </Link>
          <Link
            to="/admin/leave"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
          >
            <div className="rounded-md bg-indigo-50 p-2 text-indigo-600">
              <CalendarRange className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Leave approvals</p>
              <p className="text-xs text-muted-foreground">Full queue with filters</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
