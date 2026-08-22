import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: ReactNode
  hint?: string
  loading?: boolean
  className?: string
}

export function KpiCard({ label, value, hint, loading, className }: Props) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-4 shadow-sm', className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-20" />
      ) : (
        <p className="mt-1 text-2xl font-medium tabular-nums tracking-tight">{value}</p>
      )}
      {hint && !loading && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

interface BarListItem {
  name: string
  value: number
}

export function BarList({ data, valueFormatter }: { data: BarListItem[]; valueFormatter?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3">
          <div className="relative h-7 flex-1 overflow-hidden rounded-sm bg-zinc-50">
            <div
              className="h-full rounded-sm bg-indigo-100"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
            <span className="absolute inset-y-0 left-2 flex items-center text-xs font-medium text-zinc-700">
              {d.name}
            </span>
          </div>
          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
            {valueFormatter ? valueFormatter(d.value) : d.value}
          </span>
        </div>
      ))}
    </div>
  )
}
