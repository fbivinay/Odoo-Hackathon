import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download, TriangleAlert } from 'lucide-react'
import { BarList, KpiCard } from '@/components/tremor/KpiCard'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import {
  absenteeismOutliers,
  approvalRate,
  attendanceRate,
  countByType,
  headcountByDepartment,
  lastNDates,
  leaveDaysByDepartment,
  rollUpDay,
  withImplicitAbsences,
  type DayRoll,
} from '@/lib/analytics'
import { downloadCSV, toCSV } from '@/lib/csv'
import { asISODate, formatDayMonth, toISODate } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import type { AdminAttendanceRow, AdminLeaveRow, Employee } from '@/types'

const WINDOWS = [7, 14, 30] as const

const SERIES = [
  { key: 'present', label: 'Present', color: '#10b981' },
  { key: 'halfDay', label: 'Half day', color: '#6ee7b7' },
  { key: 'leave', label: 'Leave', color: '#fbbf24' },
  { key: 'absent', label: 'Absent', color: '#fb7185' },
] as const

const TYPE_COLORS: Record<string, string> = {
  PAID: '#4f46e5',
  SICK: '#f59e0b',
  UNPAID: '#94a3b8',
}

// ponytail: the attendance window is assembled with one request per day because the API
// exposes no date-range endpoint. Fine at demo scale, wrong at 500 employees — replace with
// GET /api/admin/attendance/summary?from=&to= returning server-side daily rollups.
function useAttendanceWindow(days: number, headcount: number) {
  const [byDate, setByDate] = useState<Map<string, AdminAttendanceRow[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setLoading(true)
    setError(null)

    const dates = lastNDates(days)
    Promise.all(
      dates.map((date) =>
        api<AdminAttendanceRow[]>(`/admin/attendance?date=${date}`)
          .then((rows) => [date, rows] as const)
          .catch(() => [date, [] as AdminAttendanceRow[]] as const),
      ),
    )
      .then((pairs) => live && setByDate(new Map(pairs)))
      .catch(() => live && setError('Could not load the attendance window.'))
      .finally(() => live && setLoading(false))

    return () => {
      live = false
    }
  }, [days])

  const rolls = useMemo<DayRoll[]>(() => {
    if (!byDate) return []
    return [...byDate.entries()].map(([date, rows]) =>
      withImplicitAbsences(rollUpDay(date, rows), headcount),
    )
  }, [byDate, headcount])

  return { byDate, rolls, loading, error }
}

export function Analytics() {
  const [days, setDays] = useState<number>(14)
  const employees = useApi<Employee[]>('/admin/employees')
  const leave = useApi<AdminLeaveRow[]>('/admin/leave')

  const roster = useMemo(() => employees.data ?? [], [employees.data])
  const allLeaves = useMemo(() => leave.data ?? [], [leave.data])
  const { byDate, rolls, loading: attLoading } = useAttendanceWindow(days, roster.length)

  // The day-window selector drives the whole page, not just the chart — leave
  // requests are included if they overlap the selected window at all, so the
  // pending/approval/type/department numbers below stay consistent with it.
  const windowStart = rolls[0]?.date ?? toISODate(new Date())
  const windowEnd = toISODate(new Date())
  const leaves = useMemo(
    () => allLeaves.filter((l) => asISODate(l.endDate) >= windowStart && asISODate(l.startDate) <= windowEnd),
    [allLeaves, windowStart, windowEnd],
  )

  const rate = attendanceRate(rolls)
  const approval = approvalRate(leaves)
  const pending = leaves.filter((l) => l.status === 'PENDING').length
  const typeTotals = countByType(leaves)
  const outliers = byDate ? absenteeismOutliers(byDate, roster) : []
  const deptLeave = leaveDaysByDepartment(leaves, roster)
  const deptHeads = headcountByDepartment(roster)

  const chartData = rolls.map((r) => ({ ...r, label: formatDayMonth(r.date) }))
  const pieData = Object.entries(typeTotals)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name[0] + name.slice(1).toLowerCase(), value, key: name }))

  const loading = employees.loading || leave.loading

  function exportAttendance() {
    downloadCSV(
      `attendance-last-${days}d-${toISODate(new Date())}`,
      toCSV(rolls, [
        { header: 'Date', value: (r) => r.date },
        { header: 'Present', value: (r) => r.present },
        { header: 'Half day', value: (r) => r.halfDay },
        { header: 'Leave', value: (r) => r.leave },
        { header: 'Absent', value: (r) => r.absent },
      ]),
    )
  }

  function exportLeave() {
    downloadCSV(
      `leave-requests-last-${days}d-${toISODate(new Date())}`,
      toCSV(leaves, [
        { header: 'Employee', value: (l) => l.employee.name },
        { header: 'Employee ID', value: (l) => l.employee.employeeId },
        { header: 'Type', value: (l) => l.type },
        { header: 'Start', value: (l) => l.startDate.slice(0, 10) },
        { header: 'End', value: (l) => l.endDate.slice(0, 10) },
        { header: 'Status', value: (l) => l.status },
        { header: 'Remarks', value: (l) => l.remarks },
        { header: 'Decision comment', value: (l) => l.comment },
      ]),
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Analytics</h2>
          <p className="text-xs text-muted-foreground">
            Attendance and leave across the organisation, over the selected window.
          </p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOWS.map((w) => (
              <SelectItem key={w} value={String(w)}>
                Last {w} days
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Headcount" value={roster.length} hint="Active employees, all-time" loading={loading} />
        <KpiCard
          label="Attendance rate"
          value={`${rate}%`}
          hint={`Present + half-day, last ${days}d`}
          loading={attLoading}
        />
        <KpiCard label="Leave pending" value={pending} hint="Awaiting a decision" loading={loading} />
        <KpiCard
          label="Approval rate"
          value={approval === null ? '—' : `${approval}%`}
          hint="Of decided requests"
          loading={loading}
        />
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">Attendance</h3>
            <p className="text-xs text-muted-foreground">Last {days} days.</p>
          </div>
          <Button size="sm" variant="outline" onClick={exportAttendance} disabled={rolls.length === 0}>
            <Download className="size-4" />
            Export
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Attendance by day</CardTitle>
            <p className="text-xs text-muted-foreground">
              Weekends show only where someone has an actual record — no absences are inferred.
            </p>
          </CardHeader>
          <CardContent>
            {attLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#71717b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e4e4e7' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#71717b' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: '1px solid #e4e4e7',
                        boxShadow: '0 1px 2px rgb(0 0 0 / 0.05)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
                    {SERIES.map((s) => (
                      <Bar
                        key={s.key}
                        dataKey={s.key}
                        name={s.label}
                        stackId="a"
                        fill={s.color}
                        radius={s.key === 'absent' ? [2, 2, 0, 0] : undefined}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Absenteeism watchlist</CardTitle>
            <p className="text-xs text-muted-foreground">
              Missed working days over the window. Approved leave is not counted.
            </p>
          </CardHeader>
          <CardContent>
            {attLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : outliers.length === 0 ? (
              <EmptyState icon={TriangleAlert} line="Nobody has missed a working day. Nice." />
            ) : (
              <ul className="divide-y divide-border">
                {outliers.map((o) => (
                  <li key={o.employeeId} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm">{o.name}</p>
                      <p className="text-xs text-muted-foreground">{o.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm tabular-nums">{o.missed} missed</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{o.rate}% of days</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">Leave</h3>
            <p className="text-xs text-muted-foreground">Requests overlapping the last {days} days.</p>
          </div>
          <Button size="sm" variant="outline" onClick={exportLeave} disabled={leaves.length === 0}>
            <Download className="size-4" />
            Export
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Leave days by type</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-56 w-full" />
              ) : pieData.length === 0 ? (
                <EmptyState icon={TriangleAlert} line="No leave requests in this window." />
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {pieData.map((d) => (
                          <Cell key={d.key} fill={TYPE_COLORS[d.key]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => [`${v} days`, '']}
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 8,
                          border: '1px solid #e4e4e7',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Approved leave days by department</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : deptLeave.length === 0 ? (
                <EmptyState icon={TriangleAlert} line="No approved leave in this window." />
              ) : (
                <BarList data={deptLeave} valueFormatter={(n) => `${n}d`} />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Team</h3>
          <p className="text-xs text-muted-foreground">Current org structure, not time-scoped.</p>
        </div>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Headcount by department</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : deptHeads.length === 0 ? (
              <EmptyState icon={TriangleAlert} line="No departments set on any employee." />
            ) : (
              <BarList data={deptHeads} />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
