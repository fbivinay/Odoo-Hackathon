import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NAMES, ROLES } from './mock.ts'

// These mirror the throw-on-load guards inside mock.ts itself — that guard only fires when
// the module is actually imported (dev server start, or this test), and only as a crash with
// no clear message about which invariant broke. These give it a named, always-run check.

test('every generated name has a role assigned, one-to-one', () => {
  assert.equal(NAMES.length, ROLES.length)
})

test('roster is exactly 150 people — 3 shifts of 50', () => {
  assert.equal(NAMES.length, 150)
})

test('no two employees share a full name', () => {
  assert.equal(new Set(NAMES).size, NAMES.length)
})

test('each 50-person shift block covers every department in ROLE_PLAN', () => {
  const depts = new Set(ROLES.map((r) => r.department))
  for (let block = 0; block < 3; block++) {
    const blockDepts = new Set(ROLES.slice(block * 50, block * 50 + 50).map((r) => r.department))
    assert.deepEqual(blockDepts, depts, `shift block ${block + 1} is missing a department`)
  }
})
