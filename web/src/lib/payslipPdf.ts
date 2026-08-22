import { formatINR } from './format'
import type { PayrollBreakdown } from './payroll'

export interface PayslipEmployee {
  name: string
  employeeId: string
  department: string | null
  jobTitle: string | null
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// jsPDF is loaded on demand — a payslip is downloaded rarely, no reason to ship it in the
// main bundle for every visitor.
export async function downloadPayslipPdf(employee: PayslipEmployee, breakdown: PayrollBreakdown, month: number, year: number) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const left = 48
  let y = 56

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Dayflow HRMS', left, y)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Payslip', left, y + 16)

  y += 44
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`${MONTHS[month]} ${year}`, left, y)
  doc.setFont('helvetica', 'normal')

  y += 24
  const info: [string, string][] = [
    ['Employee name', employee.name],
    ['Employee ID', employee.employeeId],
    ['Department', employee.department ?? '—'],
    ['Designation', employee.jobTitle ?? '—'],
  ]
  for (const [label, value] of info) {
    doc.setTextColor(113, 113, 122)
    doc.text(label, left, y)
    doc.setTextColor(24, 24, 27)
    doc.text(value, left + 140, y)
    y += 18
  }

  y += 12
  doc.setDrawColor(228, 228, 231)
  doc.line(left, y, 548, y)
  y += 28

  function row(label: string, amount: number, bold = false) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(24, 24, 27)
    doc.text(label, left, y)
    doc.text(formatINR(amount), 548, y, { align: 'right' })
    y += 20
  }

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Earnings', left, y)
  y += 20
  doc.setFontSize(10)
  row('Basic', breakdown.basic)
  row('House rent allowance', breakdown.hra)
  row('Special allowance', breakdown.specialAllowance)
  y += 4
  row('Gross pay', breakdown.grossMonthly, true)

  y += 20
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Deductions', left, y)
  y += 20
  doc.setFontSize(10)
  row('Provident fund (employee)', breakdown.employeePf)
  row('Professional tax', breakdown.professionalTax)
  y += 4
  row('Total deductions', breakdown.totalDeductions, true)

  y += 12
  doc.setDrawColor(228, 228, 231)
  doc.line(left, y, 548, y)
  y += 28

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  row('Net pay', breakdown.netMonthly, true)

  y += 32
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(161, 161, 170)
  doc.text(
    'This is a computer-generated payslip. Income tax (TDS) is not reflected here — consult',
    left,
    y,
  )
  doc.text('your finance team for tax-adjusted figures.', left, y + 11)

  doc.save(`payslip-${employee.employeeId}-${year}-${String(month + 1).padStart(2, '0')}.pdf`)
}
