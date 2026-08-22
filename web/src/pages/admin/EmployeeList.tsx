import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Copy, Download, Search, UserPlus, Users, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShiftStatBoxes } from '@/components/ShiftStatBoxes'
import { downloadCSV, toCSV } from '@/lib/csv'
import { api, ApiError } from '@/lib/api'
import { asISODate, formatDate, formatINR, toISODate } from '@/lib/format'
import { DEPARTMENTS, designationsFor } from '@/lib/orgStructure'
import { SHIFTS } from '@/lib/shifts'
import { useApi } from '@/lib/useApi'
import { useDebounced } from '@/lib/useDebounced'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminPayrollSummary, Employee, Role } from '@/types'

const PAGE_SIZE = 25
const ALL = 'ALL'

interface Row extends Employee {
  salary: number | null
}

const columns: ColumnDef<Row, any>[] = [
  { accessorKey: 'employeeId', header: 'Employee ID' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'department', header: 'Department', cell: ({ row }) => row.original.department ?? '—' },
  { accessorKey: 'jobTitle', header: 'Title', cell: ({ row }) => row.original.jobTitle ?? '—' },
  { accessorKey: 'shift', header: 'Shift', cell: ({ row }) => row.original.shift ?? '—' },
  {
    accessorKey: 'createdAt',
    header: 'Joined',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: 'salary',
    header: 'Salary',
    cell: ({ row }) => (row.original.salary === null ? '—' : formatINR(row.original.salary)),
  },
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

function InviteEmployeeDialog({ onInvited }: { onInvited: () => void }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('EMPLOYEE')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [shift, setShift] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ employee: Employee; tempPassword: string } | null>(null)

  function reset() {
    setEmail('')
    setName('')
    setRole('EMPLOYEE')
    setJobTitle('')
    setDepartment('')
    setShift('')
    setError(null)
    setResult(null)
  }

  function onDepartmentChange(next: string) {
    setDepartment(next)
    if (!designationsFor(next).includes(jobTitle)) setJobTitle('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!shift) {
      setError('Select a shift.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const data = await api<{ employee: Employee; tempPassword: string }>('/admin/employees/invite', {
        method: 'POST',
        body: {
          email,
          name,
          role,
          jobTitle: jobTitle || undefined,
          department: department || undefined,
          shift,
        },
      })
      setResult(data)
      onInvited()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add employee.')
    } finally {
      setBusy(false)
    }
  }

  function copyPassword() {
    if (!result) return
    navigator.clipboard.writeText(result.tempPassword)
    toast.success('Temporary password copied')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" />
          Add employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>{result.employee.name} has been added</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Share this password with them directly. It won't be shown again.
              </p>
              <div className="flex items-center gap-2 rounded-md border bg-zinc-50 px-3 py-2">
                <code className="flex-1 text-sm font-medium">{result.tempPassword}</code>
                <Button type="button" size="sm" variant="ghost" onClick={copyPassword}>
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setOpen(false)
                  reset()
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add employee</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="HR_ADMIN">HR admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Select value={department} onValueChange={onDepartmentChange}>
                    <SelectTrigger id="department" className="w-full">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Select value={jobTitle} onValueChange={setJobTitle} disabled={!department}>
                    <SelectTrigger id="jobTitle" className="w-full">
                      <SelectValue placeholder={department ? 'Select title' : 'Pick a department first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {designationsFor(department).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shift">Shift</Label>
                <Select value={shift} onValueChange={setShift} required>
                  <SelectTrigger id="shift" className="w-full">
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Adding…' : 'Add employee'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function EmployeeList() {
  const [search, setSearch] = useState('')
  const [shiftFilter, setShiftFilter] = useState(ALL)
  const [departmentFilter, setDepartmentFilter] = useState(ALL)
  const [titleFilter, setTitleFilter] = useState(ALL)
  const [joinedAfter, setJoinedAfter] = useState('')
  const [joinedBefore, setJoinedBefore] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [page, setPage] = useState(0)
  const navigate = useNavigate()
  const debouncedSearch = useDebounced(search)

  const { data, loading, reload } = useApi<Employee[]>(
    `/admin/employees${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ''}`,
    [debouncedSearch],
  )
  const payroll = useApi<AdminPayrollSummary[]>('/admin/payroll')

  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, shiftFilter, departmentFilter, titleFilter, joinedAfter, joinedBefore, salaryMin, salaryMax])

  const salaryById = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of payroll.data ?? []) {
      if (p.payroll) map.set(p.id, parseFloat(p.payroll.baseSalary))
    }
    return map
  }, [payroll.data])

  const withSalary = useMemo<Row[]>(
    () => (data ?? []).map((e) => ({ ...e, salary: salaryById.get(e.id) ?? null })),
    [data, salaryById],
  )

  const titleOptions = useMemo(
    () => [...new Set(withSalary.map((e) => e.jobTitle).filter((t): t is string => Boolean(t)))].sort(),
    [withSalary],
  )

  const filtered = useMemo(() => {
    const min = salaryMin ? Number(salaryMin) : null
    const max = salaryMax ? Number(salaryMax) : null
    return withSalary.filter((e) => {
      if (shiftFilter !== ALL && e.shift !== shiftFilter) return false
      if (departmentFilter !== ALL && e.department !== departmentFilter) return false
      if (titleFilter !== ALL && e.jobTitle !== titleFilter) return false
      if (joinedAfter && asISODate(e.createdAt) < joinedAfter) return false
      if (joinedBefore && asISODate(e.createdAt) > joinedBefore) return false
      if (min !== null && (e.salary === null || e.salary < min)) return false
      if (max !== null && (e.salary === null || e.salary > max)) return false
      return true
    })
  }, [withSalary, shiftFilter, departmentFilter, titleFilter, joinedAfter, joinedBefore, salaryMin, salaryMax])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const rows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const filtersActive =
    shiftFilter !== ALL ||
    departmentFilter !== ALL ||
    titleFilter !== ALL ||
    joinedAfter !== '' ||
    joinedBefore !== '' ||
    salaryMin !== '' ||
    salaryMax !== ''

  function clearFilters() {
    setShiftFilter(ALL)
    setDepartmentFilter(ALL)
    setTitleFilter(ALL)
    setJoinedAfter('')
    setJoinedBefore('')
    setSalaryMin('')
    setSalaryMax('')
  }

  function exportAll() {
    downloadCSV(
      `employees-${toISODate(new Date())}`,
      toCSV(filtered, [
        { header: 'Employee ID', value: (e) => e.employeeId },
        { header: 'Name', value: (e) => e.name },
        { header: 'Email', value: (e) => e.email },
        { header: 'Department', value: (e) => e.department },
        { header: 'Title', value: (e) => e.jobTitle },
        { header: 'Shift', value: (e) => e.shift },
        { header: 'Joined', value: (e) => formatDate(e.createdAt) },
        { header: 'Salary', value: (e) => e.salary },
        { header: 'Role', value: (e) => e.role },
        { header: 'Phone', value: (e) => e.phone },
      ]),
    )
  }

  return (
    <div className="space-y-4">
      <ShiftStatBoxes
        loading={loading}
        metricsForShift={(shift) => [{ label: 'Employees', value: (data ?? []).filter((e) => e.shift === shift).length }]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Employees</h2>
          <p className="text-xs text-muted-foreground">
            {loading ? 'Loading…' : `${filtered.length} of ${(data ?? []).length} people`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, email…"
              className="pl-8"
            />
          </div>
          <Button size="sm" variant="outline" onClick={exportAll} disabled={filtered.length === 0}>
            <Download className="size-4" />
            Export
          </Button>
          <InviteEmployeeDialog onInvited={reload} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Shift</Label>
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
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Department</Label>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All departments</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Title</Label>
          <Select value={titleFilter} onValueChange={setTitleFilter}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All titles</SelectItem>
              {titleOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Joined after</Label>
          <input
            type="date"
            value={joinedAfter}
            onChange={(e) => setJoinedAfter(e.target.value)}
            className="flex h-8 w-36 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Joined before</Label>
          <input
            type="date"
            value={joinedBefore}
            onChange={(e) => setJoinedBefore(e.target.value)}
            className="flex h-8 w-36 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Salary min</Label>
          <Input
            type="number"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
            placeholder="₹"
            className="w-24"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Salary max</Label>
          <Input
            type="number"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
            placeholder="₹"
            className="w-24"
          />
        </div>
        {filtersActive && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        initialSorting={[{ id: 'employeeId', desc: false }]}
        onRowClick={(e) => navigate(`/admin/employees/${e.id}`)}
        empty={
          <EmptyState
            icon={Users}
            line={filtersActive || search ? 'No employees match these filters.' : 'No employees yet.'}
          />
        }
      />

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground tabular-nums">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
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
