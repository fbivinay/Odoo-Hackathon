export type Role = 'EMPLOYEE' | 'HR_ADMIN'
export type LeaveType = 'PAID' | 'SICK' | 'UNPAID'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE'

// Presentational only, never sent by the API: today's live check-in and days with no row.
export type DisplayStatus = AttendanceStatus | 'IN_PROGRESS' | 'NO_RECORD'

export interface Employee {
  id: string
  employeeId: string
  email: string
  role: Role
  name: string
  phone: string | null
  address: string | null
  photoUrl: string | null
  jobTitle: string | null
  department: string | null
  emailVerified: boolean
  createdAt: string
}

export interface EmployeeRef {
  id: string
  name: string
  employeeId: string
}

export interface Attendance {
  id: string
  employeeId: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: AttendanceStatus
}

// Only present on GET /admin/attendance, which includes the employee relation.
export interface AdminAttendanceRow extends Attendance {
  employee: EmployeeRef
}

export interface Leave {
  id: string
  employeeId: string
  type: LeaveType
  startDate: string
  endDate: string
  remarks: string | null
  status: LeaveStatus
  decisionById: string | null
  comment: string | null
  createdAt: string
}

// Only present on GET /admin/leave, which includes the employee relation.
export interface AdminLeaveRow extends Leave {
  employee: EmployeeRef
}

export interface Payroll {
  id: string
  employeeId: string
  baseSalary: string
  effectiveDate: string
  createdById: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  employee: Pick<Employee, 'id' | 'employeeId' | 'email' | 'role' | 'name'>
}
