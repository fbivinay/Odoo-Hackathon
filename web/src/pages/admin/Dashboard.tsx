import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, ReceiptIndianRupee, UserPlus } from 'lucide-react'
import { DatePicker } from '@/components/DatePicker'
import { EmployeeQuickView } from '@/components/EmployeeQuickView'
import { LeaveStatusPill, LeaveTypePill } from '@/components/StatusPill'
import { ShiftStatBoxes, type ShiftMetric } from '@/components/ShiftStatBoxes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveCurrentRecord } from '@/lib/attendance'
import { formatDate, toISODate } from '@/lib/format'
import type { Shift } from '@/lib/shifts'
import { useApi } from '@/lib/useApi'
import type { AdminAttendanceRow, AdminLeaveRow, Employee } from '@/types'

const QUICK_ACTIONS = [
  { to: '/admin/employees?invite=1', label: 'Add employee', icon: UserPlus },
  { to: '/admin/leave', label: 'Review leave', icon: CalendarRange },
  { to: '/admin/payroll', label: 'Run payroll', icon: ReceiptIndianRupee },
]

function yesterdayOf(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`)
  d.setDate(d.getDate() - 1)
  return toISODate(d)
}

export function AdminDashboard() {
  const [date, setDate] = useState(toISODate(new Date()))
  const isToday = date === toISODate(new Date())

  const roster = useApi<Employee[]>('/admin/employees')
  const pendingLeave = useApi<AdminLeaveRow[]>('/admin/leave?status=PENDING')
  const approvedLeave = useApi<AdminLeaveRow[]>('/admin/leave?status=APPROVED')
  const attendanceForDate = useApi<AdminAttendanceRow[]>(`/admin/attendance?date=${date}`, [date])
  // Carry forward Shift 3's still-open overnight rows from yesterday into "today"'s count.
  const previousAttendance = useApi<AdminAttendanceRow[]>(isToday ? `/admin/attendance?date=${yesterdayOf(date)}` : null)

  const loading =
    roster.loading || pendingLeave.loading || attendanceForDate.loading || (isToday && previousAttendance.loading)

  const shiftById = useMemo(() => {
    const map = new Map<string, Shift | null>()
    for (const e of roster.data ?? []) map.set(e.id, e.shift as Shift | null)
    return map
  }, [roster.data])

  const onLeaveToday = (approvedLeave.data ?? []).filter((l) => l.startDate <= date && date <= l.endDate)

  const totalEmployees = (roster.data ?? []).length

  // Shift 3 runs past midnight — a still-open row from yesterday is the real "now" for an
  // overnight employee when today's own row doesn't exist yet, so presence is resolved per
  // employee (with carry-forward) rather than read straight off attendanceForDate.
  const presentByEmployee = useMemo(() => {
    const byEmployee = new Map((attendanceForDate.data ?? []).map((r) => [r.employeeId, r]))
    const byEmployeeYesterday = new Map((previousAttendance.data ?? []).map((r) => [r.employeeId, r]))
    const map = new Map<string, boolean>()
    for (const e of roster.data ?? []) {
      const resolved = isToday
        ? resolveCurrentRecord(e.shift, byEmployee.get(e.id) ?? null, byEmployeeYesterday.get(e.id) ?? null)
        : byEmployee.get(e.id) ?? null
      map.set(e.id, Boolean(resolved?.checkIn))
    }
    return map
  }, [roster.data, attendanceForDate.data, previousAttendance.data, isToday])

  const presentCount = [...presentByEmployee.values()].filter(Boolean).length
  const presentRate = totalEmployees > 0 ? presentCount / totalEmployees : 0

  const metricsForShift = (shift: Shift): ShiftMetric[] => {
    const headcount = (roster.data ?? []).filter((e) => e.shift === shift).length
    const present = (roster.data ?? []).filter((e) => e.shift === shift && presentByEmployee.get(e.id)).length
    const pending = (pendingLeave.data ?? []).filter((l) => shiftById.get(l.employee.id) === shift).length
    return [
      { label: 'Employees', value: headcount },
      { label: isToday ? 'Present today' : 'Present', value: present },
      { label: 'Leave pending', value: pending },
    ]
  }

  const rateForShift = (shift: Shift): number | null => {
    const headcount = (roster.data ?? []).filter((e) => e.shift === shift).length
    if (headcount === 0) return null
    const present = (roster.data ?? []).filter((e) => e.shift === shift && presentByEmployee.get(e.id)).length
    return present / headcount
  }

  const kpis = [
    { label: 'Total employees', value: totalEmployees },
    { label: isToday ? 'Present today' : 'Present', value: `${presentCount} (${Math.round(presentRate * 100)}%)` },
    { label: 'On leave', value: onLeaveToday.length },
    { label: 'Pending approvals', value: (pendingLeave.data ?? []).length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Overview</h2>
          <p className="text-xs text-muted-foreground">Headcount, attendance, and leave by shift.</p>
        </div>
        <DatePicker
          value={date}
          onChange={setDate}
          max={toISODate(new Date())}
          placeholder={isToday ? 'Today' : 'Pick a date'}
          className="w-40"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl font-medium tabular-nums tracking-tight">{k.value}</p>
            )}
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <ShiftStatBoxes metricsForShift={metricsForShift} rateForShift={rateForShift} loading={loading} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
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

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <Icon className="size-4 text-indigo-600" />
                {label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
