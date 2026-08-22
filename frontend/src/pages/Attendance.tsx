import { AttendanceStatusPill } from '@/components/StatusPill'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { displayStatus } from '@/lib/attendance'
import { formatDate, formatTime, toISODate } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import { CalendarX2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Attendance as AttendanceRow } from '@/types'

const columns: ColumnDef<AttendanceRow, any>[] = [
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
      const isToday = row.original.date === toISODate(new Date())
      return <AttendanceStatusPill status={displayStatus(row.original, isToday)} />
    },
  },
]

export function Attendance() {
  const { data, loading } = useApi<AttendanceRow[]>('/attendance')
  const rows = [...(data ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-medium">Attendance</h2>
        <p className="text-xs text-muted-foreground">Your check-in and check-out history.</p>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        empty={<EmptyState icon={CalendarX2} line="No attendance recorded yet. Check in from the dashboard." />}
      />
    </div>
  )
}
