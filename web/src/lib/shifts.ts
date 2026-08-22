// ponytail: frontend-only constraint, same situation as orgStructure.ts — Employee has no
// `shift` column on the backend yet. Selecting a shift here does nothing until that lands;
// see the handoff note for the exact schema/validator change needed.

export const SHIFTS = ['Shift 1', 'Shift 2', 'Shift 3'] as const

export type Shift = (typeof SHIFTS)[number]

export const SHIFT_TIMING: Record<Shift, string> = {
  'Shift 1': '6:00 AM – 2:00 PM',
  'Shift 2': '2:00 PM – 10:00 PM',
  'Shift 3': '10:00 PM – 6:00 AM',
}
