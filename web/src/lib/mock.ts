import { toISODate } from './format'
import { decodeToken, getToken } from './token'
import type { AdminAttendanceRow, AdminLeaveRow, Attendance, AttendanceStatus, Employee, Leave, LeaveStatus, Payroll } from '@/types'

const LATENCY = 300

const DEPARTMENTS = ['Engineering', 'Design', 'People Ops', 'Finance', 'Sales']
const JOB_TITLES = [
  'Software Engineer',
  'Senior Software Engineer',
  'Product Designer',
  'HR Generalist',
  'Financial Analyst',
  'Account Executive',
]
const NAMES = [
  'Aarav Mehta',
  'Diya Sharma',
  'Kabir Nair',
  'Ishita Rao',
  'Rohan Iyer',
  'Ananya Bose',
  'Vikram Sethi',
  'Meera Pillai',
]

function uid(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(4, '0')}`
}

interface MockUser extends Employee {
  password: string
}

const employees: MockUser[] = NAMES.map((name, i) => ({
  id: uid('emp', i + 1),
  employeeId: `EMP-00${i + 1}`,
  email: `employee${i + 1}@dayflow.dev`,
  role: 'EMPLOYEE',
  name,
  phone: `+91 98${String(10000000 + i * 137).slice(0, 8)}`,
  address: `${12 + i} Residency Road, Bengaluru 560025`,
  photoUrl: null,
  jobTitle: JOB_TITLES[i % JOB_TITLES.length],
  department: DEPARTMENTS[i % DEPARTMENTS.length],
  emailVerified: true,
  mustChangePassword: false,
  createdAt: `202${2 + (i % 3)}-0${(i % 9) + 1}-1${i % 9}T09:00:00Z`,
  password: 'Password123',
}))

const admin: MockUser = {
  id: 'emp-0000',
  employeeId: 'EMP-000',
  email: 'admin@dayflow.dev',
  role: 'HR_ADMIN',
  name: 'Ava Admin',
  phone: '+91 9800000000',
  address: '1 Residency Road, Bengaluru 560025',
  photoUrl: null,
  jobTitle: 'HR Manager',
  department: 'People Ops',
  emailVerified: true,
  mustChangePassword: false,
  createdAt: '2021-04-01T09:00:00Z',
  password: 'Password123',
}

const allUsers = [admin, ...employees]

// Mirrors attendanceService.deriveStatus on the real backend: <4h worked -> HALF_DAY, else PRESENT.
function deriveStatus(checkIn: string | null, checkOut: string | null): AttendanceStatus {
  if (!checkIn) return 'ABSENT'
  if (!checkOut) return 'PRESENT'
  const hours = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600_000
  return hours < 4 ? 'HALF_DAY' : 'PRESENT'
}

function seedAttendance(employeeId: string, days: number): Attendance[] {
  const out: Attendance[] = []
  const seedBase = employeeId.charCodeAt(employeeId.length - 1)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    if (isWeekend) continue // no row is created for weekends -> renders as NO_RECORD

    const date = toISODate(d)
    const roll = (seedBase * 7 + i * 13) % 10
    const isToday = i === 0

    if (roll === 0 && !isToday) {
      out.push({ id: uid('att', out.length + 1), employeeId, date, checkIn: null, checkOut: null, status: 'ABSENT' })
      continue
    }

    const checkIn = new Date(d)
    checkIn.setHours(9, roll * 3, 0, 0)
    const hours = roll === 1 ? 3 : 8 + (roll % 3) * 0.5
    const checkOutDate = new Date(checkIn.getTime() + hours * 3600_000)
    const checkOut = isToday ? null : checkOutDate.toISOString()

    out.push({
      id: uid('att', out.length + 1),
      employeeId,
      date,
      checkIn: checkIn.toISOString(),
      checkOut,
      status: deriveStatus(checkIn.toISOString(), checkOut),
    })
  }
  return out
}

const attendance = new Map<string, Attendance[]>()
for (const e of allUsers) attendance.set(e.id, seedAttendance(e.id, 30))

function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

let leaveSeq = 100
const leave: Leave[] = (
  [
    { emp: 1, type: 'PAID', from: 3, to: 5, status: 'PENDING', remarks: 'Family wedding in Kochi.' },
    { emp: 2, type: 'SICK', from: -2, to: -2, status: 'APPROVED', remarks: 'Fever, seen by a doctor.' },
    { emp: 3, type: 'UNPAID', from: 10, to: 14, status: 'PENDING', remarks: 'Personal travel.' },
    { emp: 4, type: 'PAID', from: -8, to: -6, status: 'REJECTED', remarks: 'Short notice trip.' },
    { emp: 5, type: 'SICK', from: 1, to: 2, status: 'PENDING', remarks: 'Minor surgery, day care.' },
  ] as const
).map(({ emp, type, from, to, status, remarks }) => {
  const e = employees[emp]
  return {
    id: uid('lv', ++leaveSeq),
    employeeId: e.id,
    type: type as Leave['type'],
    startDate: daysFromNow(from),
    endDate: daysFromNow(to),
    remarks,
    status: status as LeaveStatus,
    decisionById: status === 'PENDING' ? null : admin.id,
    comment:
      status === 'APPROVED' ? 'Get well soon.' : status === 'REJECTED' ? 'Team is short-staffed that week.' : null,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  }
})

// Approved leave already landed as LEAVE rows in attendance, mirroring leaveService.decide.
for (const l of leave.filter((l) => l.status === 'APPROVED')) markLeaveAttendance(l)

function markLeaveAttendance(l: Leave) {
  const rows = attendance.get(l.employeeId) ?? []
  const cursor = new Date(`${l.startDate}T00:00:00`)
  const end = new Date(`${l.endDate}T00:00:00`)
  while (cursor <= end) {
    const date = toISODate(cursor)
    const existing = rows.find((r) => r.date === date)
    if (existing) existing.status = 'LEAVE'
    else rows.push({ id: uid('att', rows.length + 1), employeeId: l.employeeId, date, checkIn: null, checkOut: null, status: 'LEAVE' })
    cursor.setDate(cursor.getDate() + 1)
  }
  attendance.set(l.employeeId, rows)
}

const payroll = new Map<string, Payroll[]>()
for (const [i, e] of allUsers.entries()) {
  const base = 60000 + i * 8500
  payroll.set(e.id, [
    {
      id: uid('pay', i * 2 + 1),
      employeeId: e.id,
      baseSalary: base.toFixed(2),
      effectiveDate: '2024-04-01',
      createdById: admin.id,
      createdAt: '2024-03-28T10:00:00Z',
    },
    {
      id: uid('pay', i * 2 + 2),
      employeeId: e.id,
      baseSalary: Math.round(base * 1.12).toFixed(2),
      effectiveDate: '2025-04-01',
      createdById: admin.id,
      createdAt: '2025-03-27T10:00:00Z',
    },
  ])
}

function fail(code: string, message: string): never {
  const e = new Error(message) as Error & { code: string }
  e.code = code
  throw e
}

function issueToken(u: MockUser): string {
  const header = btoa(JSON.stringify({ alg: 'mock', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ sub: u.id, role: u.role, exp: Math.floor(Date.now() / 1000) + 8 * 3600 }))
  return `${header}.${payload}.mock`
}

function self(): MockUser {
  const token = getToken()
  const claims = token ? decodeToken(token) : null
  const found = claims ? allUsers.find((u) => u.id === claims.sub) : undefined
  return found ?? employees[0]
}

function ref(u: Employee): { id: string; name: string; employeeId: string } {
  return { id: u.id, name: u.name, employeeId: u.employeeId }
}

function strip(u: MockUser): Employee {
  const { password: _password, ...rest } = u
  return rest
}

export async function mockRequest<T>(
  path: string,
  init: Omit<RequestInit, 'body'> & { body?: unknown },
): Promise<T> {
  await new Promise((r) => setTimeout(r, LATENCY))
  const [route, qs] = path.split('?')
  const q = new URLSearchParams(qs ?? '')
  const method = (init.method ?? 'GET').toUpperCase()
  const body = (init.body ?? {}) as Record<string, string>

  if (route === '/auth/signin' && method === 'POST') {
    const user = allUsers.find((u) => u.email === body.email)
    if (!user || user.password !== body.password) fail('UNAUTHORIZED', 'Invalid email or password')
    return {
      token: issueToken(user),
      employee: {
        id: user.id,
        employeeId: user.employeeId,
        email: user.email,
        role: user.role,
        name: user.name,
        mustChangePassword: user.mustChangePassword,
      },
    } as T
  }

  if (route === '/admin/employees/invite' && method === 'POST') {
    if (allUsers.some((u) => u.employeeId === body.employeeId || u.email === body.email))
      fail('CONFLICT', 'An account with this email or employee ID already exists')
    const tempPassword = 'TempPass123'
    const user: MockUser = {
      id: uid('emp', allUsers.length + 1),
      employeeId: body.employeeId,
      email: body.email,
      role: (body as unknown as { role?: 'EMPLOYEE' | 'HR_ADMIN' }).role ?? 'EMPLOYEE',
      name: body.name,
      phone: null,
      address: null,
      photoUrl: null,
      jobTitle: (body as unknown as { jobTitle?: string }).jobTitle ?? null,
      department: (body as unknown as { department?: string }).department ?? null,
      emailVerified: true,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      password: tempPassword,
    }
    allUsers.push(user)
    employees.push(user)
    attendance.set(user.id, seedAttendance(user.id, 30))
    payroll.set(user.id, [])
    return { employee: strip(user), tempPassword } as T
  }

  if (route === '/me/password' && method === 'PATCH') {
    const user = self()
    if (user.password !== body.currentPassword) fail('UNAUTHORIZED', 'Current password is incorrect')
    user.password = body.newPassword
    user.mustChangePassword = false
    return { id: user.id } as T
  }

  const me = self()

  if (route === '/me' && method === 'GET') return strip(me) as T

  if (route === '/me' && method === 'PATCH') {
    Object.assign(me, { phone: body.phone ?? me.phone, address: body.address ?? me.address, photoUrl: body.photoUrl ?? me.photoUrl })
    return strip(me) as T
  }

  if (route === '/attendance' && method === 'GET') {
    const rows = attendance.get(me.id) ?? []
    const from = q.get('from')
    const to = q.get('to')
    return rows.filter((r) => (!from || r.date >= from) && (!to || r.date <= to)) as T
  }

  if (route === '/attendance/check-in' && method === 'POST') {
    const rows = attendance.get(me.id) ?? []
    const today = toISODate(new Date())
    let row = rows.find((r) => r.date === today)
    if (row?.checkIn) fail('CONFLICT', 'Already checked in today')
    if (!row) {
      row = { id: uid('att', rows.length + 1), employeeId: me.id, date: today, checkIn: null, checkOut: null, status: 'ABSENT' }
      rows.push(row)
    }
    row.checkIn = new Date().toISOString()
    row.status = 'PRESENT'
    return row as T
  }

  if (route === '/attendance/check-out' && method === 'POST') {
    const rows = attendance.get(me.id) ?? []
    const today = toISODate(new Date())
    const row = rows.find((r) => r.date === today)
    if (!row?.checkIn) fail('BAD_REQUEST', 'Must check in before checking out')
    if (row.checkOut) fail('CONFLICT', 'Already checked out today')
    row.checkOut = new Date().toISOString()
    row.status = deriveStatus(row.checkIn, row.checkOut)
    return row as T
  }

  if (route === '/leave' && method === 'GET') {
    return leave.filter((l) => l.employeeId === me.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) as T
  }

  if (route === '/leave' && method === 'POST') {
    const overlap = leave.some(
      (l) =>
        l.employeeId === me.id &&
        (l.status === 'PENDING' || l.status === 'APPROVED') &&
        body.startDate <= l.endDate &&
        body.endDate >= l.startDate,
    )
    if (overlap) fail('CONFLICT', 'You already have a leave request overlapping these dates')
    const row: Leave = {
      id: uid('lv', ++leaveSeq),
      employeeId: me.id,
      type: body.type as Leave['type'],
      startDate: body.startDate,
      endDate: body.endDate,
      remarks: body.remarks ?? null,
      status: 'PENDING',
      decisionById: null,
      comment: null,
      createdAt: new Date().toISOString(),
    }
    leave.unshift(row)
    return row as T
  }

  if (route === '/payroll/me' && method === 'GET') {
    const rows = (payroll.get(me.id) ?? []).sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1))
    if (!rows[0]) fail('NOT_FOUND', 'No payroll record found')
    return rows[0] as T
  }

  if (route === '/admin/employees' && method === 'GET') {
    const search = (q.get('search') ?? '').toLowerCase()
    return employees
      .filter(
        (e) =>
          !search ||
          e.name.toLowerCase().includes(search) ||
          e.email.toLowerCase().includes(search) ||
          e.employeeId.toLowerCase().includes(search),
      )
      .sort((a, b) => (a.name < b.name ? -1 : 1))
      .map(strip) as T
  }

  if (route.startsWith('/admin/employees/') && method === 'GET') {
    const id = route.split('/')[3]
    const e = employees.find((x) => x.id === id) ?? fail('NOT_FOUND', 'Employee not found')
    return strip(e) as T
  }

  if (route.startsWith('/admin/employees/') && method === 'PATCH') {
    const id = route.split('/')[3]
    const e = employees.find((x) => x.id === id) ?? fail('NOT_FOUND', 'Employee not found')
    Object.assign(e, body)
    return strip(e) as T
  }

  if (route === '/admin/attendance' && method === 'GET') {
    const date = q.get('date')
    if (!date) fail('BAD_REQUEST', 'date query param is required (YYYY-MM-DD)')
    const rows: AdminAttendanceRow[] = []
    for (const e of employees) {
      const row = (attendance.get(e.id) ?? []).find((r) => r.date === date)
      if (row) rows.push({ ...row, employee: ref(e) })
    }
    return rows.sort((a, b) => (a.employee.name < b.employee.name ? -1 : 1)) as T
  }

  if (route === '/admin/leave' && method === 'GET') {
    const status = q.get('status')
    return leave
      .filter((l) => !status || l.status === status)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((l) => ({ ...l, employee: ref(allUsers.find((u) => u.id === l.employeeId)!) })) as AdminLeaveRow[] as T
  }

  if (route.startsWith('/admin/leave/') && method === 'PATCH') {
    const id = route.split('/')[3]
    const row = leave.find((l) => l.id === id) ?? fail('NOT_FOUND', 'Leave request not found')
    if (row.status !== 'PENDING') fail('BAD_REQUEST', 'Only pending requests can be decided')
    row.status = body.status as LeaveStatus
    row.comment = body.comment ?? null
    row.decisionById = admin.id
    if (row.status === 'APPROVED') markLeaveAttendance(row)
    return row as T
  }

  if (route === '/admin/payroll' && method === 'POST') {
    const id = body.employeeId
    const row: Payroll = {
      id: uid('pay', Date.now() % 10000),
      employeeId: id,
      baseSalary: Number(body.baseSalary).toFixed(2),
      effectiveDate: body.effectiveDate,
      createdById: admin.id,
      createdAt: new Date().toISOString(),
    }
    const rows = payroll.get(id) ?? []
    payroll.set(id, [...rows, row])
    return row as T
  }

  if (route.startsWith('/admin/payroll/') && route.endsWith('/history') && method === 'GET') {
    const id = route.split('/')[3]
    return [...(payroll.get(id) ?? [])].sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1)) as T
  }

  fail('NOT_FOUND', `No mock handler for ${method} ${route}`)
}
