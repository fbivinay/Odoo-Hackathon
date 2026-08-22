import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download, Search, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/ui/input'
import { downloadCSV, toCSV } from '@/lib/csv'
import { formatDate, toISODate } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import { useDebounced } from '@/lib/useDebounced'
import type { ColumnDef } from '@tanstack/react-table'
import type { Employee } from '@/types'

const PAGE_SIZE = 25

const columns: ColumnDef<Employee, any>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'employeeId', header: 'Employee ID' },
  { accessorKey: 'department', header: 'Department', cell: ({ row }) => row.original.department ?? '—' },
  { accessorKey: 'jobTitle', header: 'Title', cell: ({ row }) => row.original.jobTitle ?? '—' },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <Badge variant={row.original.role === 'HR_ADMIN' ? 'default' : 'secondary'}>
        {row.original.role === 'HR_ADMIN' ? 'HR admin' : 'Employee'}
      </Badge>
    ),
  },
]

export function EmployeeList() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const navigate = useNavigate()
  const debouncedSearch = useDebounced(search)

  const { data, loading } = useApi<Employee[]>(
    `/admin/employees${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ''}`,
    [debouncedSearch],
  )

  useEffect(() => setPage(0), [debouncedSearch])

  const all = useMemo(() => data ?? [], [data])
  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
  const rows = all.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  function exportAll() {
    downloadCSV(
      `employees-${toISODate(new Date())}`,
      toCSV(all, [
        { header: 'Name', value: (e) => e.name },
        { header: 'Employee ID', value: (e) => e.employeeId },
        { header: 'Email', value: (e) => e.email },
        { header: 'Department', value: (e) => e.department },
        { header: 'Title', value: (e) => e.jobTitle },
        { header: 'Role', value: (e) => e.role },
        { header: 'Phone', value: (e) => e.phone },
        { header: 'Joined', value: (e) => formatDate(e.createdAt) },
      ]),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Employees</h2>
          <p className="text-xs text-muted-foreground">
            {loading ? 'Loading…' : `${all.length} ${all.length === 1 ? 'person' : 'people'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, email…"
              className="pl-8"
            />
          </div>
          <Button size="sm" variant="outline" onClick={exportAll} disabled={all.length === 0}>
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        onRowClick={(e) => navigate(`/admin/employees/${e.id}`)}
        empty={
          <EmptyState
            icon={Users}
            line={search ? 'No employees match that search.' : 'No employees yet.'}
          />
        }
      />

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground tabular-nums">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, all.length)} of {all.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              Page {page + 1} of {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
