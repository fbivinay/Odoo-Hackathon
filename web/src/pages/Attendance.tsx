import { useState } from 'react'
import { AttendanceStatusPill } from '@/components/StatusPill'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSession } from '@/auth/session'
import { displayStatus, groupByWeek, type WeekSummary } from '@/lib/attendance'
import { asISODate, formatDate, formatTime, toISODate } from '@/lib/format'
import { lateMinutesFor, SHIFT_TIMING, type Shift } from '@/lib/shifts'
import { useApi } from '@/lib/useApi'
import { CalendarX2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Attendance as AttendanceRow } from '@/types'

function dailyColumns(shift: string | null): ColumnDef<AttendanceRow, any>[] {
  return [
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
    {
      accessorKey: 'checkIn',
      header: 'Check in',
      enableSorting: false,
      cell: ({ row }) => {
        const late = lateMinutesFor(row.original.checkIn, shift)
        return (
          <span className="flex items-center gap-1.5">
            {formatTime(row.original.checkIn)}
            {late !== null && (
              <Badge variant="outline" className="border-amber-200 text-[10px] text-amber-700">
                {late}m late
              </Badge>
            )}
          </span>
        )
      },
    },
    {
      accessorKey: 'checkOut',
      header: 'Check out',
      enableSorting: false,
      cell: ({ row }) => formatTime(row.original.checkOut),
    },
    {
      id: 'shift',
      header: 'Shift',
      enableSorting: false,
      cell: () => (shift ? <span className="text-xs text-muted-foreground">{SHIFT_TIMING[shift as Shift]}</span> : '—'),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => {
        const isToday = asISODate(row.original.date) === toISODate(new Date())
        return <AttendanceStatusPill status={displayStatus(row.original, isToday)} />
      },
    },
  ]
}

const weeklyColumns: ColumnDef<WeekSummary, any>[] = [
  {
    id: 'week',
    header: 'Week',
    cell: ({ row }) => `${formatDate(row.original.weekStart)} – ${formatDate(row.original.weekEnd)}`,
  },
  { accessorKey: 'present', header: 'Present', enableSorting: false },
  { accessorKey: 'halfDay', header: 'Half day', enableSorting: false },
  { accessorKey: 'leave', header: 'Leave', enableSorting: false },
  { accessorKey: 'absent', header: 'Absent', enableSorting: false },
]

export function Attendance() {
  const { employee } = useSession()
  const [view, setView] = useState<'daily' | 'weekly'>('daily')
  const { data, loading } = useApi<AttendanceRow[]>('/attendance')
  const daily = [...(data ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1))
  const weekly = groupByWeek(data ?? [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium">Attendance</h2>
          <p className="text-xs text-muted-foreground">
            Your check-in and check-out history.
            {employee?.shift && ` You're on ${employee.shift} (${SHIFT_TIMING[employee.shift as Shift]}).`}
          </p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as 'daily' | 'weekly')}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'daily' ? (
        <DataTable
          columns={dailyColumns(employee?.shift ?? null)}
          data={daily}
          loading={loading}
          empty={<EmptyState icon={CalendarX2} line="No attendance recorded yet. Check in from the dashboard." />}
        />
      ) : (
        <DataTable
          columns={weeklyColumns}
          data={weekly}
          loading={loading}
          empty={<EmptyState icon={CalendarX2} line="No attendance recorded yet." />}
        />
      )}
    </div>
  )
}
