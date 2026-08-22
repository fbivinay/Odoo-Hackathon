import { useState } from 'react'
import { AttendanceStatusPill } from '@/components/StatusPill'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { displayStatus, groupByWeek, type WeekSummary } from '@/lib/attendance'
import { asISODate, formatDate, formatTime, toISODate } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import { CalendarX2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Attendance as AttendanceRow } from '@/types'

const dailyColumns: ColumnDef<AttendanceRow, any>[] = [
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
  {
    accessorKey: 'checkIn',
    header: 'Check in',
    enableSorting: false,
    cell: ({ row }) => formatTime(row.original.checkIn),
  },
  {
    accessorKey: 'checkOut',
    header: 'Check out',
    enableSorting: false,
    cell: ({ row }) => formatTime(row.original.checkOut),
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
  const [view, setView] = useState<'daily' | 'weekly'>('daily')
  const { data, loading } = useApi<AttendanceRow[]>('/attendance')
  const daily = [...(data ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1))
  const weekly = groupByWeek(data ?? [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium">Attendance</h2>
          <p className="text-xs text-muted-foreground">Your check-in and check-out history.</p>
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
          columns={dailyColumns}
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
