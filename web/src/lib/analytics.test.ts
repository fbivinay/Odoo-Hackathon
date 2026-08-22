import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  absenteeismOutliers,
  approvalRate,
  attendanceRate,
  countByType,
  headcountByDepartment,
  isWeekend,
  lastNDates,
  leaveDays,
  leaveDaysByDepartment,
  rollUpDay,
  withImplicitAbsences,
} from './analytics.ts'

const emp = (id: string, name: string, department: string | null) =>
  ({
    id,
    employeeId: `EMP-${id}`,
    email: `${id}@x.dev`,
    role: 'EMPLOYEE',
    name,
    phone: null,
    address: null,
    photoUrl: null,
    jobTitle: null,
    department,
    emailVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  }) as any

const att = (employeeId: string, date: string, status: string) =>
  ({
    id: `${employeeId}-${date}`,
    employeeId,
    date: `${date}T00:00:00.000Z`,
    checkIn: null,
    checkOut: null,
    status,
    employee: { id: employeeId, name: employeeId, employeeId },
  }) as any

const lv = (employeeId: string, type: string, start: string, end: string, status: string) =>
  ({
    id: `${employeeId}-${start}`,
    employeeId,
    type,
    startDate: `${start}T00:00:00.000Z`,
    endDate: `${end}T00:00:00.000Z`,
    remarks: null,
    status,
    decisionById: null,
    comment: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    employee: { id: employeeId, name: employeeId, employeeId },
  }) as any

test('lastNDates returns n ascending days ending today', () => {
  const d = lastNDates(3, new Date('2026-08-20T12:00:00'))
  assert.deepEqual(d, ['2026-08-18', '2026-08-19', '2026-08-20'])
})

test('isWeekend flags Saturday and Sunday only', () => {
  assert.equal(isWeekend('2026-08-22'), true) // Saturday
  assert.equal(isWeekend('2026-08-23'), true) // Sunday
  assert.equal(isWeekend('2026-08-24'), false) // Monday
})

test('leaveDays is inclusive of both endpoints', () => {
  assert.equal(leaveDays({ startDate: '2026-08-10', endDate: '2026-08-10' }), 1)
  assert.equal(leaveDays({ startDate: '2026-08-10', endDate: '2026-08-12' }), 3)
})

test('leaveDays tolerates full ISO datetimes from the API', () => {
  assert.equal(
    leaveDays({ startDate: '2026-08-10T00:00:00.000Z', endDate: '2026-08-12T00:00:00.000Z' }),
    3,
  )
})

test('rollUpDay buckets each status', () => {
  const roll = rollUpDay('2026-08-24', [
    att('a', '2026-08-24', 'PRESENT'),
    att('b', '2026-08-24', 'HALF_DAY'),
    att('c', '2026-08-24', 'LEAVE'),
    att('d', '2026-08-24', 'ABSENT'),
  ])
  assert.deepEqual(roll, { date: '2026-08-24', present: 1, halfDay: 1, absent: 1, leave: 1 })
})

test('withImplicitAbsences counts employees who have no row at all', () => {
  const roll = { date: '2026-08-24', present: 2, halfDay: 0, absent: 0, leave: 0 }
  assert.equal(withImplicitAbsences(roll, 5).absent, 3)
})

test('withImplicitAbsences leaves weekends empty instead of marking a total no-show', () => {
  const saturday = { date: '2026-08-22', present: 0, halfDay: 0, absent: 0, leave: 0 }
  assert.equal(withImplicitAbsences(saturday, 10).absent, 0)
})

test('withImplicitAbsences never goes negative when rows exceed headcount', () => {
  const roll = { date: '2026-08-24', present: 9, halfDay: 0, absent: 0, leave: 0 }
  assert.equal(withImplicitAbsences(roll, 5).absent, 0)
})

test('attendanceRate ignores weekends and excludes leave from the denominator', () => {
  const rolls = [
    { date: '2026-08-24', present: 8, halfDay: 0, absent: 2, leave: 5 }, // Mon
    { date: '2026-08-22', present: 0, halfDay: 0, absent: 99, leave: 0 }, // Sat, ignored
  ]
  assert.equal(attendanceRate(rolls), 80)
})

test('attendanceRate returns 0 rather than dividing by zero', () => {
  assert.equal(attendanceRate([]), 0)
  assert.equal(attendanceRate([{ date: '2026-08-24', present: 0, halfDay: 0, absent: 0, leave: 3 }]), 0)
})

test('countByType sums days, not request counts', () => {
  const totals = countByType([
    lv('a', 'PAID', '2026-08-10', '2026-08-12', 'APPROVED'),
    lv('b', 'SICK', '2026-08-11', '2026-08-11', 'PENDING'),
  ])
  assert.deepEqual(totals, { PAID: 3, SICK: 1, UNPAID: 0 })
})

test('approvalRate ignores pending and returns null with nothing decided', () => {
  assert.equal(approvalRate([lv('a', 'PAID', '2026-08-10', '2026-08-10', 'PENDING')]), null)
  assert.equal(
    approvalRate([
      lv('a', 'PAID', '2026-08-10', '2026-08-10', 'APPROVED'),
      lv('b', 'PAID', '2026-08-11', '2026-08-11', 'REJECTED'),
      lv('c', 'PAID', '2026-08-12', '2026-08-12', 'PENDING'),
    ]),
    50,
  )
})

test('leaveDaysByDepartment counts approved leave only', () => {
  const employees = [emp('a', 'A', 'Engineering'), emp('b', 'B', 'Engineering'), emp('c', 'C', null)]
  const rows = leaveDaysByDepartment(
    [
      lv('a', 'PAID', '2026-08-10', '2026-08-12', 'APPROVED'), // 3
      lv('b', 'SICK', '2026-08-10', '2026-08-10', 'APPROVED'), // 1
      lv('b', 'PAID', '2026-08-20', '2026-08-25', 'PENDING'), // ignored
      lv('c', 'PAID', '2026-08-10', '2026-08-11', 'APPROVED'), // 2, unassigned
    ],
    employees,
  )
  assert.deepEqual(rows, [
    { name: 'Engineering', value: 4 },
    { name: 'Unassigned', value: 2 },
  ])
})

test('headcountByDepartment groups blank departments under Unassigned', () => {
  const rows = headcountByDepartment([
    emp('a', 'A', 'Engineering'),
    emp('b', 'B', 'Engineering'),
    emp('c', 'C', ''),
  ])
  assert.deepEqual(rows, [
    { name: 'Engineering', value: 2 },
    { name: 'Unassigned', value: 1 },
  ])
})

test('absenteeismOutliers ranks by missed days and excludes approved leave', () => {
  const employees = [emp('a', 'Alice', 'Eng'), emp('b', 'Bob', 'Eng'), emp('c', 'Cleo', 'Eng')]
  const byDate = new Map([
    // Mon, Tue, Wed
    ['2026-08-24', [att('a', '2026-08-24', 'PRESENT'), att('b', '2026-08-24', 'ABSENT'), att('c', '2026-08-24', 'LEAVE')]],
    ['2026-08-25', [att('a', '2026-08-25', 'PRESENT'), att('b', '2026-08-25', 'ABSENT'), att('c', '2026-08-25', 'LEAVE')]],
    ['2026-08-26', [att('a', '2026-08-26', 'HALF_DAY'), att('b', '2026-08-26', 'PRESENT'), att('c', '2026-08-26', 'LEAVE')]],
  ])

  const out = absenteeismOutliers(byDate, employees)
  assert.equal(out.length, 2, 'Cleo is on approved leave throughout and must not rank')
  assert.equal(out[0].name, 'Bob')
  assert.equal(out[0].missed, 2)
  assert.equal(out[1].name, 'Alice')
  assert.equal(out[1].missed, 0.5)
})

test('absenteeismOutliers treats a missing row as a full absence', () => {
  const employees = [emp('a', 'Alice', 'Eng'), emp('b', 'Bob', 'Eng')]
  const byDate = new Map([['2026-08-24', [att('a', '2026-08-24', 'PRESENT')]]])
  const out = absenteeismOutliers(byDate, employees)
  assert.deepEqual(
    out.map((o) => [o.name, o.missed, o.rate]),
    [['Bob', 1, 100]],
  )
})

test('absenteeismOutliers returns nothing when the window is all weekend', () => {
  const byDate = new Map([['2026-08-22', []], ['2026-08-23', []]])
  assert.deepEqual(absenteeismOutliers(byDate, [emp('a', 'Alice', 'Eng')]), [])
})
