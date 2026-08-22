import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toCSV } from './csv.ts'

const row = (value: unknown) => [{ value }]
const col = [{ header: 'Value', value: (r: { value: unknown }) => r.value }]

test('formula-leading values are prefixed so spreadsheets read them as text', () => {
  for (const payload of ['=SUM(A1:A10)', '+1+1', '-1+1', '@cmd|/c calc']) {
    const csv = toCSV(row(payload), col)
    assert.equal(csv, `Value\r\n'${payload}`)
  }
})

test('leading tab or carriage return is also neutralised', () => {
  assert.equal(toCSV(row('\t=cmd|/c calc'), col), "Value\r\n'\t=cmd|/c calc")
  // The CR that made this dangerous also has to be quoted per RFC 4180.
  assert.equal(toCSV(row('\r=SUM(A1:A10)'), col), 'Value\r\n"\'\r=SUM(A1:A10)"')
})

test('plain values pass through unquoted', () => {
  assert.equal(toCSV(row('Engineering'), col), 'Value\r\nEngineering')
})

test('commas and quotes are CSV-quoted and internal quotes doubled', () => {
  assert.equal(toCSV(row('Doe, Jane'), col), 'Value\r\n"Doe, Jane"')
  assert.equal(toCSV(row('say "hi"'), col), 'Value\r\n"say ""hi"""')
})

test('a quote-injection attempt stays contained inside one field', () => {
  const payload = 'foo","=SUM(A1:A10)'
  const csv = toCSV(row(payload), col)
  assert.equal(csv, 'Value\r\n"foo"",""=SUM(A1:A10)"')
})

test('null and undefined become empty cells', () => {
  assert.equal(toCSV(row(null), col), 'Value\r\n')
  assert.equal(toCSV(row(undefined), col), 'Value\r\n')
})
