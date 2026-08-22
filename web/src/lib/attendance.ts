import { asISODate, toISODate } from './format.ts'
import { shiftPhaseFor } from './shifts.ts'
import type { Attendance, DisplayStatus } from '@/types'

export const STATUS_META: Record<DisplayStatus, { label: string; bar: string; pill: string }> = {
  PRESENT: {
    label: 'Present',
    bar: 'bg-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  HALF_DAY: {
    label: 'Half day',
    bar: 'bg-emerald-300',
    pill: 'bg-emerald-50 text-emerald-600 ring-emerald-600/20',
  },
  IN_PROGRESS: {
    label: 'In progress',
    bar: 'bg-indigo-500',
    pill: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  },
  LEAVE: {
    label: 'Leave',
    bar: 'bg-amber-400',
    pill: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  },
  ABSENT: {
    label: 'Absent',
    bar: 'bg-rose-400',
    pill: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  },
  NO_RECORD: {
    label: 'No record',
    bar: 'bg-zinc-200',
    pill: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
  },
  UPCOMING: {
    label: 'Not started',
    bar: 'bg-zinc-100',
    pill: 'bg-zinc-50 text-zinc-500 ring-zinc-400/20',
  },
}

// Today's check-in-without-checkout is a client-only display state — the API's
// AttendanceStatus enum has no IN_PROGRESS value. A missing row for today reads as:
// - shift hasn't started yet -> "not started" (UPCOMING)
// - shift has started/ended with nobody checked in -> "absent" (a real, actionable status,
//   not a blank cell — this is what makes an empty attendance day mean something on the grid)
export function displayStatus(
  record: { checkIn: string | null; checkOut: string | null; status: string } | null,
  isToday: boolean,
  shift?: string | null,
  workDateISO?: string,
): DisplayStatus {
  if (!record) {
    if (isToday && workDateISO) {
      const phase = shiftPhaseFor(shift ?? null, workDateISO)
      if (phase === 'UPCOMING') return 'UPCOMING'
      if (phase === 'ACTIVE' || phase === 'ENDED') return 'ABSENT'
    }
    return 'NO_RECORD'
  }
  if (isToday && record.checkIn && !record.checkOut) return 'IN_PROGRESS'
  return record.status as DisplayStatus
}

// Shift 3 runs 10pm-6am — a still-open row dated yesterday IS the employee's current status
// when "today" hasn't reached the point their overnight shift would have ended yet.
export function resolveCurrentRecord<T extends { checkIn: string | null; checkOut: string | null }>(
  shift: string | null,
  todayRecord: T | null,
  yesterdayRecord: T | null,
): T | null {
  if (todayRecord) return todayRecord
  if (shift === 'Shift 3' && yesterdayRecord?.checkIn && !yesterdayRecord.checkOut) return yesterdayRecord
  return null
}

export interface RibbonDay {
  date: string
  status: DisplayStatus
  checkIn: string | null
  checkOut: string | null
}

export interface WeekSummary {
  weekStart: string
  weekEnd: string
  present: number
  halfDay: number
  leave: number
  absent: number
}

function mondayOf(isoDate: string): Date {
  const d = new Date(`${isoDate}T00:00:00`)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

// Buckets attendance rows into Mon-Sun weeks. Weeks with no rows at all (nobody hired yet,
// or the range doesn't reach that far back) simply don't appear — nothing to summarize.
export function groupByWeek(records: Attendance[]): WeekSummary[] {
  const byWeek = new Map<string, WeekSummary>()
  for (const r of records) {
    const monday = mondayOf(asISODate(r.date))
    const key = toISODate(monday)
    let week = byWeek.get(key)
    if (!week) {
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      week = { weekStart: key, weekEnd: toISODate(sunday), present: 0, halfDay: 0, leave: 0, absent: 0 }
      byWeek.set(key, week)
    }
    if (r.status === 'PRESENT') week.present++
    else if (r.status === 'HALF_DAY') week.halfDay++
    else if (r.status === 'LEAVE') week.leave++
    else week.absent++
  }
  return [...byWeek.values()].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
}

// Fills gaps (weekends, days with no attendance row) so the ribbon always shows a fixed window.
export function buildRibbonDays(records: Attendance[], days = 30, shift: string | null = null): RibbonDay[] {
  const byDate = new Map(records.map((r) => [asISODate(r.date), r]))
  const today = toISODate(new Date())
  const out: RibbonDay[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = toISODate(d)
    const record = byDate.get(date) ?? null
    out.push({
      date,
      status: displayStatus(record, date === today, shift, date),
      checkIn: record?.checkIn ?? null,
      checkOut: record?.checkOut ?? null,
    })
  }
  return out
}
