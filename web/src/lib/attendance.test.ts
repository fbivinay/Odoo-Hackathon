import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupByWeek } from './attendance.ts'

const row = (date: string, status: string) => ({ id: date, employeeId: 'e1', date, checkIn: null, checkOut: null, status }) as any

test('groups rows into their Mon-Sun week, keyed by the Monday', () => {
  const weeks = groupByWeek([row('2026-08-17', 'PRESENT'), row('2026-08-21', 'HALF_DAY')]) // Mon + Fri, same week
  assert.equal(weeks.length, 1)
  assert.equal(weeks[0].weekStart, '2026-08-17')
  assert.equal(weeks[0].weekEnd, '2026-08-23')
  assert.equal(weeks[0].present, 1)
  assert.equal(weeks[0].halfDay, 1)
})

test('a Sunday belongs to the week that started the preceding Monday', () => {
  const weeks = groupByWeek([row('2026-08-23', 'PRESENT')]) // Sunday
  assert.equal(weeks.length, 1)
  assert.equal(weeks[0].weekStart, '2026-08-17')
})

test('rows spanning two weeks produce two buckets, most recent first', () => {
  const weeks = groupByWeek([row('2026-08-10', 'ABSENT'), row('2026-08-17', 'PRESENT')])
  assert.equal(weeks.length, 2)
  assert.equal(weeks[0].weekStart, '2026-08-17')
  assert.equal(weeks[1].weekStart, '2026-08-10')
})

test('tolerates full ISO datetimes from the real API, not just plain dates', () => {
  const weeks = groupByWeek([row('2026-08-17T00:00:00.000Z', 'PRESENT')])
  assert.equal(weeks.length, 1)
  assert.equal(weeks[0].present, 1)
})

test('LEAVE and ABSENT are counted separately from PRESENT/HALF_DAY', () => {
  const weeks = groupByWeek([row('2026-08-17', 'LEAVE'), row('2026-08-18', 'ABSENT')])
  assert.deepEqual(
    { present: weeks[0].present, halfDay: weeks[0].halfDay, leave: weeks[0].leave, absent: weeks[0].absent },
    { present: 0, halfDay: 0, leave: 1, absent: 1 },
  )
})

test('empty input produces no weeks', () => {
  assert.deepEqual(groupByWeek([]), [])
})
