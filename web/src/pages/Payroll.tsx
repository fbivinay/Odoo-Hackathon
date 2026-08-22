import { useState } from 'react'
import { toast } from 'sonner'
import { Download, ReceiptIndianRupee } from 'lucide-react'
import { useSession } from '@/auth/session'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatINR } from '@/lib/format'
import { computePayrollBreakdown } from '@/lib/payroll'
import { downloadPayslipPdf } from '@/lib/payslipPdf'
import { useApi } from '@/lib/useApi'
import type { Payroll as PayrollRow } from '@/types'

const now = new Date()

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={bold ? 'text-sm font-medium' : 'text-sm text-muted-foreground'}>{label}</span>
      <span className={bold ? 'text-sm font-medium tabular-nums' : 'text-sm tabular-nums'}>{value}</span>
    </div>
  )
}

export function Payroll() {
  const { employee } = useSession()
  const { data, loading, error } = useApi<PayrollRow>('/payroll/me')
  const [downloading, setDownloading] = useState(false)

  const breakdown = data ? computePayrollBreakdown(data.baseSalary) : null

  async function onDownload() {
    if (!breakdown || !employee) return
    setDownloading(true)
    try {
      await downloadPayslipPdf(
        {
          name: employee.name,
          employeeId: employee.employeeId,
          department: employee.department,
          jobTitle: employee.jobTitle,
        },
        breakdown,
        now.getMonth(),
        now.getFullYear(),
      )
    } catch {
      toast.error('Could not generate the payslip.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Payroll</CardTitle>
            <p className="text-xs text-muted-foreground">Read-only. Changes are made by HR.</p>
          </div>
          {breakdown && (
            <Button size="sm" variant="outline" onClick={onDownload} disabled={downloading}>
              <Download className="size-3.5" />
              {downloading ? 'Preparing…' : 'Payslip PDF'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : error || !data || !breakdown ? (
            <EmptyState icon={ReceiptIndianRupee} line="No payroll record yet. HR hasn't set a salary structure." />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Net pay</p>
                <p className="mt-1 text-2xl font-medium tabular-nums tracking-tight">
                  {formatINR(breakdown.netMonthly)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/ month</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Effective from {formatDate(data.effectiveDate)} · {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </p>
              </div>

              <Separator />

              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Earnings</p>
                <Line label="Basic" value={formatINR(breakdown.basic)} />
                <Line label="House rent allowance" value={formatINR(breakdown.hra)} />
                <Line label="Special allowance" value={formatINR(breakdown.specialAllowance)} />
                <Separator className="my-1" />
                <Line label="Gross pay" value={formatINR(breakdown.grossMonthly)} bold />
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Deductions</p>
                <Line label="Provident fund" value={formatINR(breakdown.employeePf)} />
                <Line label="Professional tax" value={formatINR(breakdown.professionalTax)} />
                <Separator className="my-1" />
                <Line label="Total deductions" value={formatINR(breakdown.totalDeductions)} bold />
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Annual</p>
                <Line label="Cost to company (CTC)" value={formatINR(breakdown.annualCTC)} />
              </div>

              <p className="text-[11px] text-muted-foreground">
                Breakdown is computed from your base salary using a standard payroll structure.
                Income tax (TDS) isn't reflected — check with HR for tax-adjusted figures.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
