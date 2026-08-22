import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDate, toISODate } from '@/lib/format'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: string
  onChange: (isoDate: string) => void
  min?: string
  max?: string
  placeholder?: string
  className?: string
  id?: string
}

function toLocalDate(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

export function DatePicker({ value, onChange, min, max, placeholder = 'Pick a date', className, id }: DatePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn('h-9 w-full justify-start gap-2 font-normal', !value && 'text-muted-foreground', className)}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          {value ? formatDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? toLocalDate(value) : undefined}
          disabled={[
            ...(min ? [{ before: toLocalDate(min) }] : []),
            ...(max ? [{ after: toLocalDate(max) }] : []),
          ]}
          onSelect={(day) => {
            if (!day) return
            onChange(toISODate(day))
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
