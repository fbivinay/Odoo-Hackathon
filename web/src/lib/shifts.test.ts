import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lateMinutesFor } from './shifts.ts'

test('on-time check-in (within grace) returns null', () => {
  assert.equal(lateMinutesFor('2026-08-24T06:10:00', 'Shift 1'), null)
})

test('check-in past the grace window returns minutes late', () => {
  assert.equal(lateMinutesFor('2026-08-24T06:30:00', 'Shift 1'), 30)
})

test('checking in early is never "late"', () => {
  assert.equal(lateMinutesFor('2026-08-24T05:40:00', 'Shift 1'), null)
})

test('no check-in, no shift, or unknown shift all return null', () => {
  assert.equal(lateMinutesFor(null, 'Shift 1'), null)
  assert.equal(lateMinutesFor('2026-08-24T06:30:00', null), null)
  assert.equal(lateMinutesFor('2026-08-24T06:30:00', 'Night Owl'), null)
})

test('Shift 3 check-in read back after local midnight still anchors to the prior day\'s 10pm start', () => {
  // Checked in at 22:20 on the 24th -> 20 minutes late against a 22:00 start.
  assert.equal(lateMinutesFor('2026-08-24T22:20:00', 'Shift 3'), 20)
  // Checked in at 00:10 on the 25th, i.e. shortly after the same 22:00-on-the-24th start.
  assert.equal(lateMinutesFor('2026-08-25T00:10:00', 'Shift 3'), 130)
})
