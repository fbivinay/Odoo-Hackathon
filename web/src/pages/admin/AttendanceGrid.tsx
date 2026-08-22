import { useState } from 'react'
import { CalendarDays, Moon } from 'lucide-react'
import { AttendanceStatusPill } from '@/components/StatusPill'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/DataTable'
import { DatePicker } from '@/components/DatePicker'
import { EmployeeQuickView } from '@/components/EmployeeQuickView'
import { EmptyState } from '@/components/EmptyState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { displayStatus, resolveCurrentRecord } from '@/lib/attendance'
import { formatTime, toISODate } from '@/lib/format'
import { lateMinutesFor, SHIFTS, SHIFT_TIMING, type Shift } from '@/lib/shifts'
import { useApi } from '@/lib/useApi'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminAttendanceRow, Employee } from '@/types'

const ALL = 'ALL'

interface GridRow {
  employee: { id: string; name: string; employeeId: string; shift: string | null }
  record: AdminAttendanceRow | null
  carriedOver: boolean
}

function yesterdayOf(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`)
  d.setDate(d.getDate() - 1)
  return toISODate(d)
}

export function AttendanceGrid() {
  const [date, setDate] = useState(toISODate(new Date()))
  const [shiftFilter, setShiftFilter] = useState(ALL)
  const roster = useApi<Employee[]>('/admin/employees')
  const records = useApi<AdminAttendanceRow[]>(`/admin/attendance?date=${date}`, [date])
  const isToday = date === toISODate(new Date())
  // Shift 3 runs past midnight — a still-open row from yesterday is the real "now" for an
  // overnight employee when today's own row doesn't exist yet.
  const previousDay = yesterdayOf(date)
  const previousRecords = useApi<AdminAttendanceRow[]>(isToday ? `/admin/attendance?date=${previousDay}` : null)

  const byEmployee = new Map((records.data ?? []).map((r) => [r.employeeId, r]))
  const byEmployeeYesterday = new Map((previousRecords.data ?? []).map((r) => [r.employeeId, r]))
  const rows: GridRow[] = (roster.data ?? [])
    .filter((e) => shiftFilter === ALL || e.shift === shiftFilter)
    .map((e) => {
      const todayRecord = byEmployee.get(e.id) ?? null
      const resolved = isToday
        ? resolveCurrentRecord(e.shift, todayRecord, byEmployeeYesterday.get(e.id) ?? null)
        : todayRecord
      return {
        employee: { id: e.id, name: e.name, employeeId: e.employeeId, shift: e.shift },
        record: resolved,
        carriedOver: resolved !== null && resolved !== todayRecord,
      }
    })

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
      id: 'shift',
      header: 'Shift',
      enableSorting: false,
      cell: ({ row }) => {
        const shift = row.original.employee.shift
        return shift ? (
          <div>
            <p>{shift}</p>
            <p className="text-[11px] text-muted-foreground">{SHIFT_TIMING[shift as Shift]}</p>
          </div>
        ) : (
          '—'
        )
      },
    },
    {
      id: 'checkIn',
      header: 'Check in',
      enableSorting: false,
      cell: ({ row }) => {
        const checkIn = row.original.record?.checkIn ?? null
        const late = lateMinutesFor(checkIn, row.original.employee.shift)
        return (
          <span className="flex items-center gap-1.5">
            {formatTime(checkIn)}
            {row.original.carriedOver && (
              <Badge variant="outline" className="border-indigo-200 text-[10px] text-indigo-700">
                <Moon className="size-2.5" />
                overnight
              </Badge>
            )}
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
      id: 'checkOut',
      header: 'Check out',
      enableSorting: false,
      cell: ({ row }) => formatTime(row.original.record?.checkOut ?? null),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => (
        <AttendanceStatusPill
          status={displayStatus(row.original.record, isToday, row.original.employee.shift, date)}
        />
      ),
    },
  ]

  const loading = roster.loading || records.loading || (isToday && previousRecords.loading)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium">Attendance</h2>
          <p className="text-xs text-muted-foreground">All employees for one day.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={shiftFilter} onValueChange={setShiftFilter}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All shifts</SelectItem>
              {SHIFTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePicker value={date} onChange={setDate} max={toISODate(new Date())} className="w-40" />
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
