import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download, ReceiptIndianRupee } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ShiftStatBoxes } from '@/components/ShiftStatBoxes'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/DataTable'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatINR } from '@/lib/format'
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
  const roster = useApi<Employee[]>('/admin/employees')
  const payroll = useApi<AdminPayrollSummary[]>('/admin/payroll')
  const loading = roster.loading || payroll.loading

  const baseSalaryById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of payroll.data ?? []) if (p.payroll) map.set(p.id, p.payroll.baseSalary)
    return map
  }, [payroll.data])

  const rows = useMemo<Row[]>(() => {
    return (roster.data ?? [])
      .filter((e) => shiftFilter === ALL || e.shift === shiftFilter)
      .map((employee) => {
        const base = baseSalaryById.get(employee.id)
        return { employee, breakdown: base ? computePayrollBreakdown(base) : null }
      })
  }, [roster.data, baseSalaryById, shiftFilter])

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
        <Select value={shiftFilter} onValueChange={setShiftFilter}>
          <SelectTrigger size="sm" className="w-32">
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
        <p className="text-xs text-muted-foreground">
          {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        initialSorting={[{ id: 'employeeId', desc: false }]}
        empty={<EmptyState icon={ReceiptIndianRupee} line="No employees in this shift." />}
      />
    </div>
  )
}
