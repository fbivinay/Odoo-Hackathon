import { useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { EmployeeQuickView } from '@/components/EmployeeQuickView'
import { LeaveStatusPill, LeaveTypePill } from '@/components/StatusPill'
import { ShiftStatBoxes, type ShiftMetric } from '@/components/ShiftStatBoxes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, toISODate } from '@/lib/format'
import type { Shift } from '@/lib/shifts'
import { useApi } from '@/lib/useApi'
import type { AdminAttendanceRow, AdminLeaveRow, Employee } from '@/types'

export function AdminDashboard() {
  const [date, setDate] = useState(toISODate(new Date()))
  const isToday = date === toISODate(new Date())

  const roster = useApi<Employee[]>('/admin/employees')
  const pendingLeave = useApi<AdminLeaveRow[]>('/admin/leave?status=PENDING')
  const attendanceForDate = useApi<AdminAttendanceRow[]>(`/admin/attendance?date=${date}`, [date])

  const loading = roster.loading || pendingLeave.loading || attendanceForDate.loading

  const shiftById = useMemo(() => {
    const map = new Map<string, Shift | null>()
    for (const e of roster.data ?? []) map.set(e.id, e.shift as Shift | null)
    return map
  }, [roster.data])

  const metricsForShift = (shift: Shift): ShiftMetric[] => {
    const headcount = (roster.data ?? []).filter((e) => e.shift === shift).length
    const present = (attendanceForDate.data ?? []).filter(
      (r) => shiftById.get(r.employeeId) === shift && r.checkIn,
    ).length
    const pending = (pendingLeave.data ?? []).filter((l) => shiftById.get(l.employee.id) === shift).length
    return [
      { label: 'Employees', value: headcount },
      { label: isToday ? 'Present today' : 'Present', value: present },
      { label: 'Leave pending', value: pending },
    ]
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Overview</h2>
          <p className="text-xs text-muted-foreground">Headcount, attendance, and leave by shift.</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <input
            type="date"
            value={date}
            max={toISODate(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
      </div>

      <ShiftStatBoxes metricsForShift={metricsForShift} loading={loading} />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Pending approvals</CardTitle>
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
                      <EmployeeQuickView employeeId={l.employee.id}>
                        <button type="button" className="font-medium hover:underline">
                          {l.employee.name}
                        </button>
                      </EmployeeQuickView>{' '}
                      <LeaveTypePill type={l.type} />
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
    </div>
  )
}
