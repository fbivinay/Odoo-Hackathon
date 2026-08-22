import { Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { SHIFTS, SHIFT_TIMING, type Shift } from '@/lib/shifts'
import { cn } from '@/lib/utils'

export interface ShiftMetric {
  label: string
  value: number | string
  onClick?: () => void
}

interface Props {
  metricsForShift: (shift: Shift) => ShiftMetric[]
  rateForShift?: (shift: Shift) => number | null
  loading?: boolean
  className?: string
}

export function ShiftStatBoxes({ metricsForShift, rateForShift, loading, className }: Props) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-3', className)}>
      {SHIFTS.map((shift) => {
        const metrics = metricsForShift(shift)
        const rate = rateForShift?.(shift) ?? null
        return (
          <div key={shift} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{shift}</p>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3" />
                {SHIFT_TIMING[shift]}
              </span>
            </div>
            <div
              className={cn(
                'mt-3 grid gap-3',
                metrics.length === 1 && 'grid-cols-1',
                metrics.length === 2 && 'grid-cols-2',
                metrics.length >= 3 && 'grid-cols-3',
              )}
            >
              {metrics.map((m) => (
                <div key={m.label}>
                  {loading ? (
                    <Skeleton className="h-7 w-10" />
                  ) : m.onClick ? (
                    <button
                      type="button"
                      onClick={m.onClick}
                      className="text-xl font-medium tabular-nums tracking-tight text-indigo-600 hover:underline"
                    >
                      {m.value}
                    </button>
                  ) : (
                    <p className="text-xl font-medium tabular-nums tracking-tight">{m.value}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
            {rate !== null && (
              <div className="mt-4 space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-[width]"
                    style={{ width: `${loading ? 0 : Math.round(rate * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? '—' : `${Math.round(rate * 100)}% attendance`}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
