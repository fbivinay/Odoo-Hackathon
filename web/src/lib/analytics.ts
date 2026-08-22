import { asISODate, daysBetween, toISODate } from './format.ts'
import type { AdminAttendanceRow, AdminLeaveRow, AttendanceStatus, Employee, LeaveType } from '@/types'

export interface DayRoll {
  date: string
  present: number
  halfDay: number
  absent: number
  leave: number
}

export interface NamedCount {
  name: string
  value: number
}

const UNASSIGNED = 'Unassigned'

export function lastNDates(n: number, from = new Date()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from)
    d.setDate(d.getDate() - i)
    out.push(toISODate(d))
  }
  return out
}

export function isWeekend(isoDate: string): boolean {
  const day = new Date(`${isoDate}T00:00:00`).getDay()
  return day === 0 || day === 6
}

export function rollUpDay(date: string, rows: AdminAttendanceRow[]): DayRoll {
  const roll: DayRoll = { date, present: 0, halfDay: 0, absent: 0, leave: 0 }
  for (const r of rows) {
    if (r.status === 'PRESENT') roll.present++
    else if (r.status === 'HALF_DAY') roll.halfDay++
    else if (r.status === 'LEAVE') roll.leave++
    else roll.absent++
  }
  return roll
}

// Employees with no row for a working day never reached the attendance table at all, so they
// only surface as absent once the roster size is folded in. Weekends are left alone — nothing
// is written for them, and filling them in would read as a total no-show.
export function withImplicitAbsences(roll: DayRoll, headcount: number): DayRoll {
  if (isWeekend(roll.date)) return roll
  const recorded = roll.present + roll.halfDay + roll.absent + roll.leave
  return { ...roll, absent: roll.absent + Math.max(0, headcount - recorded) }
}

export function attendanceRate(rolls: DayRoll[]): number {
  const working = rolls.filter((r) => !isWeekend(r.date))
  if (working.length === 0) return 0
  const attended = working.reduce((sum, r) => sum + r.present + r.halfDay * 0.5, 0)
  const expected = working.reduce((sum, r) => sum + r.present + r.halfDay + r.absent, 0)
  return expected === 0 ? 0 : Math.round((attended / expected) * 100)
}

export function leaveDays(leave: { startDate: string; endDate: string }): number {
  return daysBetween(asISODate(leave.startDate), asISODate(leave.endDate))
}

export function countByType(leaves: AdminLeaveRow[]): Record<LeaveType, number> {
  const out: Record<LeaveType, number> = { PAID: 0, SICK: 0, UNPAID: 0 }
  for (const l of leaves) out[l.type] += leaveDays(l)
  return out
}

export function approvalRate(leaves: AdminLeaveRow[]): number | null {
  const decided = leaves.filter((l) => l.status !== 'PENDING')
  if (decided.length === 0) return null
  const approved = decided.filter((l) => l.status === 'APPROVED').length
  return Math.round((approved / decided.length) * 100)
}

export function leaveDaysByDepartment(
  leaves: AdminLeaveRow[],
  employees: Employee[],
): NamedCount[] {
  const dept = new Map(employees.map((e) => [e.id, e.department || UNASSIGNED]))
  const totals = new Map<string, number>()
  for (const l of leaves) {
    if (l.status !== 'APPROVED') continue
    const key = dept.get(l.employeeId) ?? UNASSIGNED
    totals.set(key, (totals.get(key) ?? 0) + leaveDays(l))
  }
  return [...totals]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function headcountByDepartment(employees: Employee[]): NamedCount[] {
  const totals = new Map<string, number>()
  for (const e of employees) {
    const key = e.department || UNASSIGNED
    totals.set(key, (totals.get(key) ?? 0) + 1)
  }
  return [...totals]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export interface Outlier {
  employeeId: string
  name: string
  code: string
  missed: number
  rate: number
}

// Ranks who is absent most across the window. Half-days count as half a miss.
export function absenteeismOutliers(
  byDate: Map<string, AdminAttendanceRow[]>,
  employees: Employee[],
  limit = 5,
): Outlier[] {
  const workingDays = [...byDate.keys()].filter((d) => !isWeekend(d))
  if (workingDays.length === 0) return []

  const seen = new Map<string, { present: number; missed: number }>()
  for (const e of employees) seen.set(e.id, { present: 0, missed: 0 })

  for (const date of workingDays) {
    const rows = byDate.get(date) ?? []
    const status = new Map<string, AttendanceStatus>(rows.map((r) => [r.employeeId, r.status]))
    for (const e of employees) {
      const tally = seen.get(e.id)!
      const s = status.get(e.id)
      if (s === 'LEAVE') continue // approved leave is not absenteeism
      if (s === 'PRESENT') tally.present++
      else if (s === 'HALF_DAY') {
        tally.present++
        tally.missed += 0.5
      } else tally.missed++
    }
  }

  return employees
    .map((e) => {
      const t = seen.get(e.id)!
      const counted = t.present + t.missed
      return {
        employeeId: e.id,
        name: e.name,
        code: e.employeeId,
        missed: t.missed,
        rate: counted === 0 ? 0 : Math.round((t.missed / counted) * 100),
      }
    })
    .filter((o) => o.missed > 0)
    .sort((a, b) => b.missed - a.missed)
    .slice(0, limit)
}
