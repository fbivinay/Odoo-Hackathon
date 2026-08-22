import { STATUS_META, buildRibbonDays } from '@/lib/attendance'
import { formatDayMonth, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Attendance } from '@/types'

const SIZES = {
  full: 'h-10 w-2 rounded-sm',
  mini: 'h-4 w-[3px] rounded-[1px]',
} as const

interface Props {
  records: Attendance[]
  days?: number
  size?: keyof typeof SIZES
  className?: string
}

export function AttendanceRibbon({ records, days = 30, size = 'full', className }: Props) {
  const ribbon = buildRibbonDays(records, days)
  return (
    <div className={cn('flex items-end', size === 'full' ? 'gap-1' : 'gap-[2px]', className)}>
      {ribbon.map((d) => {
        const meta = STATUS_META[d.status]
        return (
          <div
            key={d.date}
            className={cn(SIZES[size], meta.bar, 'transition-opacity hover:opacity-70')}
            title={`${formatDayMonth(d.date)} · ${meta.label}${
              d.checkIn ? ` · ${formatTime(d.checkIn)}–${formatTime(d.checkOut)}` : ''
            }`}
          />
        )
      })}
    </div>
  )
}

export function RibbonLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {Object.entries(STATUS_META).map(([key, meta]) => (
        <span key={key} className="flex items-center gap-1.5">
          <span className={cn('h-2.5 w-2.5 rounded-sm', meta.bar)} />
          {meta.label}
        </span>
      ))}
    </div>
  )
}
