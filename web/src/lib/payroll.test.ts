import assert from 'node:assert/strict'
import { test } from 'node:test'
import { computePayrollBreakdown } from './payroll.ts'

test('breaks a basic salary of 50000 into the expected components', () => {
  const b = computePayrollBreakdown(50000)
  assert.equal(b.basic, 50000)
  assert.equal(b.hra, 20000) // 40%
  assert.equal(b.specialAllowance, 10000) // 20%
  assert.equal(b.grossMonthly, 80000)
  assert.equal(b.employeePf, 6000) // 12%
  assert.equal(b.professionalTax, 200)
  assert.equal(b.totalDeductions, 6200)
  assert.equal(b.netMonthly, 73800)
})

test('annual CTC folds in the employer PF match, times 12', () => {
  const b = computePayrollBreakdown(50000)
  // employerPf = 6000; CTC = (gross 80000 + employerPf 6000) * 12
  assert.equal(b.employerPf, 6000)
  assert.equal(b.annualCTC, 1032000)
})

test('accepts a string baseSalary, as returned by the API (Decimal serialized as text)', () => {
  assert.deepEqual(computePayrollBreakdown('50000.00'), computePayrollBreakdown(50000))
})

test('net pay is always gross minus total deductions', () => {
  const b = computePayrollBreakdown(72345)
  assert.equal(b.netMonthly, Math.round((b.grossMonthly - b.totalDeductions) * 100) / 100)
})
