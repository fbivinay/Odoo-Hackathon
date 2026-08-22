import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, ReceiptIndianRupee, UserPlus } from 'lucide-react'
import { DatePicker } from '@/components/DatePicker'
import { EmployeeQuickView } from '@/components/EmployeeQuickView'
import { KpiListDialog } from '@/components/KpiListDialog'
import { LeaveDecisionDialog } from '@/components/LeaveDecisionDialog'
import { LeaveStatusPill, LeaveTypePill } from '@/components/StatusPill'
import { ShiftStatBoxes, type ShiftMetric } from '@/components/ShiftStatBoxes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveCurrentRecord } from '@/lib/attendance'
import { formatDate, toISODate } from '@/lib/format'
import type { Shift } from '@/lib/shifts'
import { useApi } from '@/lib/useApi'
import type { AdminAttendanceRow, AdminLeaveRow, Employee } from '@/types'

type KpiDrilldown =
  | { title: string; employees: Employee[]; leaveRows?: undefined; decidable?: undefined }
  | { title: string; leaveRows: AdminLeaveRow[]; decidable?: boolean; employees?: undefined }

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

function reloadAll(...apis: { reload: () => void }[]) {
  for (const a of apis) a.reload()
}

export function AdminDashboard() {
  const [date, setDate] = useState(toISODate(new Date()))
  const isToday = date === toISODate(new Date())
  const [drilldown, setDrilldown] = useState<KpiDrilldown | null>(null)
  const [decidingRow, setDecidingRow] = useState<AdminLeaveRow | null>(null)

  const roster = useApi<Employee[]>('/admin/employees')
  const pendingLeave = useApi<AdminLeaveRow[]>('/admin/leave?status=PENDING')
  const approvedLeave = useApi<AdminLeaveRow[]>('/admin/leave?status=APPROVED')
  const attendanceForDate = useApi<AdminAttendanceRow[]>(`/admin/attendance?date=${date}`, [date])
  // Carry forward Shift 3's still-open overnight rows from yesterday into "today"'s count.
  const previousAttendance = useApi<AdminAttendanceRow[]>(isToday ? `/admin/attendance?date=${yesterdayOf(date)}` : null)

  const loading =
    roster.loading || pendingLeave.loading || attendanceForDate.loading || (isToday && previousAttendance.loading)

  function onDecided() {
    reloadAll(pendingLeave, approvedLeave, attendanceForDate)
  }

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

  const employeesInShift = (shift: Shift) => (roster.data ?? []).filter((e) => e.shift === shift)
  const presentInShift = (shift: Shift) => employeesInShift(shift).filter((e) => presentByEmployee.get(e.id))
  const pendingInShift = (shift: Shift) => (pendingLeave.data ?? []).filter((l) => shiftById.get(l.employee.id) === shift)

  const metricsForShift = (shift: Shift): ShiftMetric[] => [
    {
      label: 'Employees',
      value: employeesInShift(shift).length,
      onClick: () => setDrilldown({ title: `${shift} — Employees`, employees: employeesInShift(shift) }),
    },
    {
      label: isToday ? 'Present today' : 'Present',
      value: presentInShift(shift).length,
      onClick: () => setDrilldown({ title: `${shift} — Present`, employees: presentInShift(shift) }),
    },
    {
      label: 'Leave pending',
      value: pendingInShift(shift).length,
      onClick: () => setDrilldown({ title: `${shift} — Leave pending`, leaveRows: pendingInShift(shift), decidable: true }),
    },
  ]

  const rateForShift = (shift: Shift): number | null => {
    const headcount = employeesInShift(shift).length
    if (headcount === 0) return null
    return presentInShift(shift).length / headcount
  }

  const kpis = [
    {
      label: 'Total employees',
      value: totalEmployees,
      onClick: () => setDrilldown({ title: 'Total employees', employees: roster.data ?? [] }),
    },
    {
      label: isToday ? 'Present today' : 'Present',
      value: `${presentCount} (${Math.round(presentRate * 100)}%)`,
      onClick: () =>
        setDrilldown({
          title: isToday ? 'Present today' : 'Present',
          employees: (roster.data ?? []).filter((e) => presentByEmployee.get(e.id)),
        }),
    },
    {
      label: 'On leave',
      value: onLeaveToday.length,
      onClick: () => setDrilldown({ title: 'On leave', leaveRows: onLeaveToday }),
    },
    {
      label: 'Pending approvals',
      value: (pendingLeave.data ?? []).length,
      onClick: () => setDrilldown({ title: 'Pending approvals', leaveRows: pendingLeave.data ?? [], decidable: true }),
    },
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
              <button
                type="button"
                onClick={k.onClick}
                className="text-2xl font-medium tabular-nums tracking-tight text-indigo-600 hover:underline"
              >
                {k.value}
              </button>
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
                  <li
                    key={l.id}
                    onClick={() => setDecidingRow(l)}
                    className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-zinc-50"
                  >
                    <div>
                      <p className="text-sm">
                        <span onClick={(e) => e.stopPropagation()}>
                          <EmployeeQuickView employeeId={l.employee.id}>
                            <button type="button" className="font-medium hover:underline">
                              {l.employee.name}
                            </button>
                          </EmployeeQuickView>
                        </span>{' '}
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

      <KpiListDialog
        open={drilldown !== null}
        onOpenChange={(next) => !next && setDrilldown(null)}
        title={drilldown?.title ?? ''}
        employees={drilldown?.employees}
        leaveRows={drilldown?.leaveRows}
        decidable={drilldown?.decidable}
        onDecided={onDecided}
      />

      <LeaveDecisionDialog
        open={decidingRow !== null}
        onOpenChange={(next) => !next && setDecidingRow(null)}
        leave={decidingRow}
        onDecided={() => {
          setDecidingRow(null)
          onDecided()
        }}
      />
    </div>
  )
}
