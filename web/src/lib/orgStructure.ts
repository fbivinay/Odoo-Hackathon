// ponytail: hardcoded here because department/designation are free-text strings on the backend
// (Employee.department, Employee.jobTitle — no enum, no reference table). This is a frontend-only
// constraint to stop garbage input; the DB still accepts anything. Move to backend-owned
// Department/Designation tables + GET /api/departments /api/designations once that lands, and
// delete this file.

export const DEPARTMENTS = [
  'Engineering',
  'Design',
  'Product',
  'People Ops',
  'Finance',
  'Sales',
  'Marketing',
] as const

export type Department = (typeof DEPARTMENTS)[number]

export const DESIGNATIONS_BY_DEPARTMENT: Record<Department, string[]> = {
  Engineering: [
    'Software Engineer',
    'Senior Software Engineer',
    'Staff Engineer',
    'Engineering Manager',
    'QA Engineer',
    'DevOps Engineer',
  ],
  Design: [
    'Product Designer',
    'Senior Product Designer',
    'UX Researcher',
    'Design Manager',
  ],
  Product: [
    'Product Manager',
    'Senior Product Manager',
    'Associate Product Manager',
    'Product Analyst',
  ],
  'People Ops': [
    'HR Generalist',
    'HR Manager',
    'Talent Acquisition Specialist',
    'People Ops Coordinator',
  ],
  Finance: [
    'Financial Analyst',
    'Senior Financial Analyst',
    'Accountant',
    'Finance Manager',
  ],
  Sales: [
    'Sales Development Representative',
    'Account Executive',
    'Senior Account Executive',
    'Sales Manager',
  ],
  Marketing: [
    'Marketing Associate',
    'Content Marketer',
    'Growth Marketer',
    'Marketing Manager',
  ],
}

export function designationsFor(department: string): string[] {
  return DESIGNATIONS_BY_DEPARTMENT[department as Department] ?? []
}
