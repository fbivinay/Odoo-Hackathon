// The backend has a real `shift` column now (invite requires it). This file still owns the
// canonical list of values, since there's no `GET /api/shifts` endpoint — same situation as
// orgStructure.ts's departments/designations.

export const SHIFTS = ['Shift 1', 'Shift 2', 'Shift 3'] as const

export type Shift = (typeof SHIFTS)[number]

// Start hour in 24h clock, local time. Each shift is 8 hours; Shift 3 wraps past midnight.
export const SHIFT_START_HOUR: Record<Shift, number> = {
  'Shift 1': 6,
  'Shift 2': 14,
  'Shift 3': 22,
}

export const SHIFT_TIMING: Record<Shift, string> = {
  'Shift 1': '6:00 AM – 2:00 PM',
  'Shift 2': '2:00 PM – 10:00 PM',
  'Shift 3': '10:00 PM – 6:00 AM',
}

const GRACE_MINUTES = 15

// Minutes past the shift's scheduled start, or null if there's nothing to flag (no check-in,
// unknown shift, or within the grace window). Never negative — checking in early isn't "late".
export function lateMinutesFor(checkInIso: string | null, shift: string | null): number | null {
  if (!checkInIso || !shift || !(shift in SHIFT_START_HOUR)) return null
  const checkIn = new Date(checkInIso)
  const scheduled = new Date(checkIn)
  scheduled.setHours(SHIFT_START_HOUR[shift as Shift], 0, 0, 0)

  // Shift 3 starts at 22:00 — a check-in read back after local midnight belongs to the
  // scheduled start on the *previous* day, not the next one.
  if (checkIn.getHours() < 12 && SHIFT_START_HOUR[shift as Shift] >= 12) {
    scheduled.setDate(scheduled.getDate() - 1)
  }

  const minutesLate = Math.round((checkIn.getTime() - scheduled.getTime()) / 60000)
  return minutesLate > GRACE_MINUTES ? minutesLate : null
}
