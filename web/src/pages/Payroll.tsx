import { ReceiptIndianRupee } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatINR } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import type { Payroll as PayrollRow } from '@/types'

export function Payroll() {
  const { data, loading, error } = useApi<PayrollRow>('/payroll/me')

  return (
    <Card className="max-w-md shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Payroll</CardTitle>
        <p className="text-xs text-muted-foreground">Read-only. Changes are made by HR.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : error || !data ? (
          <EmptyState icon={ReceiptIndianRupee} line="No payroll record yet. HR hasn't set a salary structure." />
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Base salary</p>
              <p className="mt-1 text-2xl font-medium tabular-nums tracking-tight">
                {formatINR(data.baseSalary)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ month</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Effective from</p>
              <p className="mt-0.5 text-sm">{formatDate(data.effectiveDate)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
