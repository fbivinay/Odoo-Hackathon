// ponytail: the backend's Payroll model stores exactly one number — `baseSalary` per month.
// There is no HRA/allowance/deduction/CTC data anywhere in the database. The breakdown below
// is computed client-side from that single figure using a standard-shaped Indian payroll
// structure (HRA as % of basic, a flat special allowance, statutory PF, a flat professional
// tax) — illustrative and clearly labelled as such on the payslip, not sourced from any real
// company policy. TDS/income tax is deliberately left out: it depends on the employee's tax
// regime and declarations, which don't exist in this system, and faking a number there would
// be actively misleading rather than a reasonable placeholder. Replace this whole module once
// the backend has a real payroll-structure model (see the standing backend handoff notes).

export const HRA_RATE = 0.4 // % of basic — common metro-city rate
export const SPECIAL_ALLOWANCE_RATE = 0.2 // % of basic
export const EMPLOYEE_PF_RATE = 0.12 // % of basic, statutory (employee share)
export const EMPLOYER_PF_RATE = 0.12 // % of basic, statutory (employer share, folds into CTC)
export const PROFESSIONAL_TAX = 200 // flat monthly, common state rate

export interface PayrollBreakdown {
  basic: number
  hra: number
  specialAllowance: number
  grossMonthly: number
  employeePf: number
  professionalTax: number
  totalDeductions: number
  netMonthly: number
  employerPf: number
  annualCTC: number
}

export function computePayrollBreakdown(baseSalary: number | string): PayrollBreakdown {
  const basic = typeof baseSalary === 'string' ? parseFloat(baseSalary) : baseSalary
  const hra = round2(basic * HRA_RATE)
  const specialAllowance = round2(basic * SPECIAL_ALLOWANCE_RATE)
  const grossMonthly = round2(basic + hra + specialAllowance)

  const employeePf = round2(basic * EMPLOYEE_PF_RATE)
  const totalDeductions = round2(employeePf + PROFESSIONAL_TAX)
  const netMonthly = round2(grossMonthly - totalDeductions)

  const employerPf = round2(basic * EMPLOYER_PF_RATE)
  const annualCTC = round2((grossMonthly + employerPf) * 12)

  return {
    basic: round2(basic),
    hra,
    specialAllowance,
    grossMonthly,
    employeePf,
    professionalTax: PROFESSIONAL_TAX,
    totalDeductions,
    netMonthly,
    employerPf,
    annualCTC,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
