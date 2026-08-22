import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/ui/input'
import { useApi } from '@/lib/useApi'
import type { ColumnDef } from '@tanstack/react-table'
import type { Employee } from '@/types'

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
  const navigate = useNavigate()
  const { data, loading } = useApi<Employee[]>(
    `/admin/employees${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    [search],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium">Employees</h2>
          <p className="text-xs text-muted-foreground">{(data ?? []).length} people</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, email…"
            className="pl-8"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        loading={loading}
        onRowClick={(e) => navigate(`/admin/employees/${e.id}`)}
        empty={<EmptyState icon={Users} line="No employees match that search." />}
      />
    </div>
  )
}
