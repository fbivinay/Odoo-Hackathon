import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { AttendanceStatusPill } from '@/components/StatusPill'
import { DataTable } from '@/components/DataTable'
import { EmployeeQuickView } from '@/components/EmployeeQuickView'
import { EmptyState } from '@/components/EmptyState'
import { displayStatus } from '@/lib/attendance'
import { formatTime, toISODate } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminAttendanceRow, Employee } from '@/types'

interface GridRow {
  employee: { id: string; name: string; employeeId: string }
  record: AdminAttendanceRow | null
}

export function AttendanceGrid() {
  const [date, setDate] = useState(toISODate(new Date()))
  const roster = useApi<Employee[]>('/admin/employees')
  const records = useApi<AdminAttendanceRow[]>(`/admin/attendance?date=${date}`, [date])
  const isToday = date === toISODate(new Date())

  const byEmployee = new Map((records.data ?? []).map((r) => [r.employeeId, r]))
  const rows: GridRow[] = (roster.data ?? []).map((e) => ({
    employee: { id: e.id, name: e.name, employeeId: e.employeeId },
    record: byEmployee.get(e.id) ?? null,
  }))

  const columns: ColumnDef<GridRow, any>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (r) => r.employee.name,
      cell: ({ row }) => (
        <EmployeeQuickView employeeId={row.original.employee.id}>
          <button type="button" className="font-medium hover:underline">
            {row.original.employee.name}
          </button>
        </EmployeeQuickView>
      ),
    },
    { id: 'employeeId', header: 'Employee ID', accessorFn: (r) => r.employee.employeeId },
    {
      id: 'checkIn',
      header: 'Check in',
      enableSorting: false,
      cell: ({ row }) => formatTime(row.original.record?.checkIn ?? null),
    },
    {
      id: 'checkOut',
      header: 'Check out',
      enableSorting: false,
      cell: ({ row }) => formatTime(row.original.record?.checkOut ?? null),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => <AttendanceStatusPill status={displayStatus(row.original.record, isToday)} />,
    },
  ]

  const loading = roster.loading || records.loading

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium">Attendance</h2>
          <p className="text-xs text-muted-foreground">All employees for one day.</p>
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

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        empty={<EmptyState icon={CalendarDays} line="No employees to show." />}
      />
    </div>
  )
}
