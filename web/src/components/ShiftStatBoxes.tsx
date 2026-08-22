import { Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { SHIFTS, SHIFT_TIMING, type Shift } from '@/lib/shifts'
import { cn } from '@/lib/utils'

export interface ShiftMetric {
  label: string
  value: number | string
}

interface Props {
  metricsForShift: (shift: Shift) => ShiftMetric[]
  loading?: boolean
  className?: string
}

export function ShiftStatBoxes({ metricsForShift, loading, className }: Props) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-3', className)}>
      {SHIFTS.map((shift) => {
        const metrics = metricsForShift(shift)
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
                  ) : (
                    <p className="text-xl font-medium tabular-nums tracking-tight">{m.value}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
