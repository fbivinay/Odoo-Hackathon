import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download, ReceiptIndianRupee, X } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ShiftStatBoxes } from '@/components/ShiftStatBoxes'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/DataTable'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { asISODate, formatINR } from '@/lib/format'
import { DEPARTMENTS } from '@/lib/orgStructure'
import { computePayrollBreakdown, type PayrollBreakdown } from '@/lib/payroll'
import { downloadPayslipPdf } from '@/lib/payslipPdf'
import { SHIFTS } from '@/lib/shifts'
import { useApi } from '@/lib/useApi'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminPayrollSummary, Employee } from '@/types'

const ALL = 'ALL'
const now = new Date()

interface Row {
  employee: Employee
  breakdown: PayrollBreakdown | null
}

export function AdminPayroll() {
  const [shiftFilter, setShiftFilter] = useState(ALL)
  const [departmentFilter, setDepartmentFilter] = useState(ALL)
  const [titleFilter, setTitleFilter] = useState(ALL)
  const [joinedAfter, setJoinedAfter] = useState('')
  const [joinedBefore, setJoinedBefore] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const roster = useApi<Employee[]>('/admin/employees')
  const payroll = useApi<AdminPayrollSummary[]>('/admin/payroll')
  const loading = roster.loading || payroll.loading

  const baseSalaryById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of payroll.data ?? []) if (p.payroll) map.set(p.id, p.payroll.baseSalary)
    return map
  }, [payroll.data])

  const titleOptions = useMemo(
    () => [...new Set((roster.data ?? []).map((e) => e.jobTitle).filter((t): t is string => Boolean(t)))].sort(),
    [roster.data],
  )

  const rows = useMemo<Row[]>(() => {
    const min = salaryMin ? Number(salaryMin) : null
    const max = salaryMax ? Number(salaryMax) : null
    return (roster.data ?? [])
      .filter((e) => shiftFilter === ALL || e.shift === shiftFilter)
      .filter((e) => departmentFilter === ALL || e.department === departmentFilter)
      .filter((e) => titleFilter === ALL || e.jobTitle === titleFilter)
      .filter((e) => !joinedAfter || asISODate(e.createdAt) >= joinedAfter)
      .filter((e) => !joinedBefore || asISODate(e.createdAt) <= joinedBefore)
      .filter((e) => {
        if (min === null && max === null) return true
        const base = baseSalaryById.has(e.id) ? parseFloat(baseSalaryById.get(e.id)!) : null
        if (min !== null && (base === null || base < min)) return false
        if (max !== null && (base === null || base > max)) return false
        return true
      })
      .map((employee) => {
        const base = baseSalaryById.get(employee.id)
        return { employee, breakdown: base ? computePayrollBreakdown(base) : null }
      })
  }, [roster.data, baseSalaryById, shiftFilter, departmentFilter, titleFilter, joinedAfter, joinedBefore, salaryMin, salaryMax])

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

  async function onDownload(row: Row) {
    if (!row.breakdown) return
    try {
      await downloadPayslipPdf(
        {
          name: row.employee.name,
          employeeId: row.employee.employeeId,
          department: row.employee.department,
          jobTitle: row.employee.jobTitle,
        },
        row.breakdown,
        now.getMonth(),
        now.getFullYear(),
      )
    } catch {
      toast.error('Could not generate the payslip.')
    }
  }

  const columns: ColumnDef<Row, any>[] = [
    { id: 'employeeId', header: 'Employee ID', accessorFn: (r) => r.employee.employeeId },
    { id: 'name', header: 'Name', accessorFn: (r) => r.employee.name },
    { id: 'department', header: 'Department', accessorFn: (r) => r.employee.department ?? '—' },
    { id: 'shift', header: 'Shift', accessorFn: (r) => r.employee.shift ?? '—' },
    {
      id: 'basic',
      header: 'Basic',
      enableSorting: false,
      cell: ({ row }) => (row.original.breakdown ? formatINR(row.original.breakdown.basic) : '—'),
    },
    {
      id: 'gross',
      header: 'Gross',
      enableSorting: false,
      cell: ({ row }) => (row.original.breakdown ? formatINR(row.original.breakdown.grossMonthly) : '—'),
    },
    {
      id: 'deductions',
      header: 'Deductions',
      enableSorting: false,
      cell: ({ row }) => (row.original.breakdown ? formatINR(row.original.breakdown.totalDeductions) : '—'),
    },
    {
      id: 'net',
      header: 'Net pay',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.breakdown ? (
          <span className="font-medium tabular-nums">{formatINR(row.original.breakdown.netMonthly)}</span>
        ) : (
          '—'
        ),
    },
    {
      id: 'download',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          disabled={!row.original.breakdown}
          onClick={(e) => {
            e.stopPropagation()
            onDownload(row.original)
          }}
        >
          <Download className="size-3.5" />
          Payslip
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-medium">Payroll</h2>
        <p className="text-xs text-muted-foreground">
          Current salary structure by shift. Breakdown is computed from base salary using a
          standard-shaped formula — see the note on each payslip.
        </p>
      </div>

      <ShiftStatBoxes
        loading={loading}
        metricsForShift={(shift) => {
          const inShift = (roster.data ?? []).filter((e) => e.shift === shift)
          const totalNet = inShift.reduce((sum, e) => {
            const base = baseSalaryById.get(e.id)
            return sum + (base ? computePayrollBreakdown(base).netMonthly : 0)
          }, 0)
          return [
            { label: 'Employees', value: inShift.length },
            { label: 'Total net pay / mo', value: formatINR(totalNet) },
          ]
        }}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {loading ? 'Loading…' : `${rows.length} of ${(roster.data ?? []).length} people`}
        </p>
        <p className="text-xs text-muted-foreground">
          {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
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
        empty={<EmptyState icon={ReceiptIndianRupee} line={filtersActive ? 'No employees match these filters.' : 'No employees in this shift.'} />}
      />
    </div>
  )
}
