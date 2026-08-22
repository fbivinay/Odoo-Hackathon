import { toISODate } from './format'
import { decodeToken, getToken } from './token'
import { DESIGNATIONS_BY_DEPARTMENT, type Department } from './orgStructure'
import type { AdminAttendanceRow, AdminLeaveRow, Attendance, AttendanceStatus, Employee, Leave, LeaveStatus, LeaveType, Payroll } from '@/types'

const LATENCY = 300

function uid(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(4, '0')}`
}

// Small deterministic PRNG (mulberry32) so the generated roster looks the same on every
// reload instead of reshuffling — real-looking data that's also reproducible for a demo.
function rngFor(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]
}

// level: 0 = individual contributor, 1 = senior IC, 2 = manager/lead — drives tenure and pay.
const ROLE_PLAN: { department: Department; designation: string; count: number; level: 0 | 1 | 2 }[] = [
  { department: 'Engineering', designation: 'Software Engineer', count: 8, level: 0 },
  { department: 'Engineering', designation: 'Senior Software Engineer', count: 5, level: 1 },
  { department: 'Engineering', designation: 'Staff Engineer', count: 2, level: 1 },
  { department: 'Engineering', designation: 'QA Engineer', count: 1, level: 0 },
  { department: 'Engineering', designation: 'DevOps Engineer', count: 1, level: 0 },
  { department: 'Engineering', designation: 'Engineering Manager', count: 1, level: 2 },
  { department: 'Sales', designation: 'Sales Development Representative', count: 3, level: 0 },
  { department: 'Sales', designation: 'Account Executive', count: 3, level: 0 },
  { department: 'Sales', designation: 'Senior Account Executive', count: 1, level: 1 },
  { department: 'Sales', designation: 'Sales Manager', count: 1, level: 2 },
  { department: 'Product', designation: 'Product Analyst', count: 1, level: 0 },
  { department: 'Product', designation: 'Associate Product Manager', count: 1, level: 0 },
  { department: 'Product', designation: 'Product Manager', count: 2, level: 1 },
  { department: 'Product', designation: 'Senior Product Manager', count: 1, level: 1 },
  { department: 'Design', designation: 'Product Designer', count: 3, level: 0 },
  { department: 'Design', designation: 'Senior Product Designer', count: 1, level: 1 },
  { department: 'Design', designation: 'Design Manager', count: 1, level: 2 },
  { department: 'Marketing', designation: 'Marketing Associate', count: 2, level: 0 },
  { department: 'Marketing', designation: 'Content Marketer', count: 1, level: 0 },
  { department: 'Marketing', designation: 'Growth Marketer', count: 1, level: 0 },
  { department: 'Marketing', designation: 'Marketing Manager', count: 1, level: 2 },
  { department: 'People Ops', designation: 'HR Generalist', count: 2, level: 0 },
  { department: 'People Ops', designation: 'Talent Acquisition Specialist', count: 1, level: 0 },
  { department: 'People Ops', designation: 'People Ops Coordinator', count: 1, level: 0 },
  { department: 'People Ops', designation: 'HR Manager', count: 1, level: 2 },
  { department: 'Finance', designation: 'Accountant', count: 2, level: 0 },
  { department: 'Finance', designation: 'Financial Analyst', count: 1, level: 1 },
  { department: 'Finance', designation: 'Finance Manager', count: 1, level: 2 },
]

// Sanity check against orgStructure's canonical list — every designation used above must be
// one it actually offers, so the roster never drifts from what "Add employee" can produce.
for (const r of ROLE_PLAN) {
  if (!DESIGNATIONS_BY_DEPARTMENT[r.department].includes(r.designation)) {
    throw new Error(`mock.ts ROLE_PLAN references an unknown designation: ${r.department} / ${r.designation}`)
  }
}

const ROLES = ROLE_PLAN.flatMap((r) => Array.from({ length: r.count }, () => r))

const NAMES = [
  'Aarav Sharma', 'Vivaan Gupta', 'Aditya Verma', 'Vihaan Mehta', 'Arjun Nair',
  'Sai Reddy', 'Reyansh Iyer', 'Krishna Rao', 'Ishaan Kapoor', 'Rohan Malhotra',
  'Kabir Singh', 'Aryan Chauhan', 'Dhruv Rathore', 'Yash Thakur', 'Karan Bose',
  'Rahul Deshmukh', 'Amit Patil', 'Suresh Kulkarni', 'Nikhil Shinde', 'Varun Jadhav',
  'Aakash Bansal', 'Siddharth Agarwal', 'Rajesh Khanna', 'Vikram Sethi', 'Om Prakash Yadav',
  'Deepak Choudhary', 'Manoj Tiwari', 'Ravi Pillai', 'Ganesh Iyer', 'Arun Krishnan',
  'Ananya Iyengar', 'Diya Menon', 'Saanvi Pillai', 'Aadhya Krishnan', 'Myra Bhatt',
  'Anika Joshi', 'Navya Chatterjee', 'Kiara Banerjee', 'Riya Mukherjee', 'Ishita Sengupta',
  'Meera Pillai', 'Priya Nambiar', 'Sneha Subramaniam', 'Divya Krishnamurthy', 'Pooja Venkatesh',
  'Neha Kaur', 'Simran Gill', 'Harpreet Sandhu', 'Kavya Ramesh', 'Tanvi Desai',
] as const

if (NAMES.length !== ROLES.length) {
  throw new Error(`mock.ts: NAMES (${NAMES.length}) and ROLES (${ROLES.length}) must be the same length`)
}

const CITIES = [
  { city: 'Bengaluru', pin: '560025' },
  { city: 'Mumbai', pin: '400051' },
  { city: 'Pune', pin: '411014' },
  { city: 'Hyderabad', pin: '500081' },
  { city: 'Chennai', pin: '600042' },
  { city: 'Gurugram', pin: '122002' },
  { city: 'Noida', pin: '201301' },
  { city: 'Kolkata', pin: '700091' },
  { city: 'Ahmedabad', pin: '380015' },
]

function slugEmail(name: string): string {
  const parts = name.toLowerCase().split(' ')
  return `${parts[0]}.${parts[parts.length - 1]}@dayflow.dev`
}

// Tenure by level: managers have been around longest, then senior ICs, then ICs — a real
// company's seniority roughly tracks time-in-seat.
function joinDateFor(rand: () => number, level: 0 | 1 | 2): Date {
  const [minDays, maxDays] = level === 2 ? [730, 1460] : level === 1 ? [365, 1095] : [20, 730]
  const daysAgo = Math.round(minDays + rand() * (maxDays - minDays))
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d
}

const LEVEL_SALARY_RANGE: Record<0 | 1 | 2, [number, number]> = {
  0: [45000, 72000],
  1: [78000, 115000],
  2: [125000, 165000],
}

interface MockUser extends Employee {
  password: string
}

const employees: MockUser[] = NAMES.map((name, i) => {
  const role = ROLES[i]
  const rand = rngFor(i + 1)
  const place = CITIES[i % CITIES.length]
  const phoneDigits = String(6 + (i % 4)) + String(100000000 + Math.floor(rand() * 899999999)).slice(0, 9)
  return {
    id: uid('emp', i + 1),
    employeeId: uid('EMP', i + 1),
    email: slugEmail(name),
    role: 'EMPLOYEE',
    name,
    phone: `+91 ${phoneDigits}`,
    address: `${20 + i} ${['MG Road', 'Park Street', 'Church Street', 'Residency Road', 'Brigade Road'][i % 5]}, ${place.city} ${place.pin}`,
    photoUrl: null,
    jobTitle: role.designation,
    department: role.department,
    emailVerified: true,
    mustChangePassword: false,
    createdAt: joinDateFor(rand, role.level).toISOString(),
    password: 'Password123',
  }
})

const admin: MockUser = {
  id: 'emp-0000',
  employeeId: 'EMP-0000',
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

// Nobody has attendance before their join date, and Mondays/Fridays skew slightly more
// absent than midweek — both true of real offices, neither true of the old flat random roll.
function seedAttendance(employee: MockUser, days: number): Attendance[] {
  const out: Attendance[] = []
  const rand = rngFor(employee.employeeId.charCodeAt(employee.employeeId.length - 1) + days)
  const joinedAt = new Date(employee.createdAt)
  joinedAt.setHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    if (d < joinedAt) continue // not hired yet
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue // no row is created for weekends -> renders as NO_RECORD

    const date = toISODate(d)
    const isToday = i === 0
    const absenceChance = dow === 1 || dow === 5 ? 0.09 : 0.04

    if (!isToday && rand() < absenceChance) {
      out.push({ id: uid('att', out.length + 1), employeeId: employee.id, date, checkIn: null, checkOut: null, status: 'ABSENT' })
      continue
    }

    const checkIn = new Date(d)
    checkIn.setHours(9, Math.floor(rand() * 45), 0, 0)
    const isHalfDay = !isToday && rand() < 0.06
    const hours = isHalfDay ? 3 + rand() : 8 + rand() * 1.5
    const checkOutDate = new Date(checkIn.getTime() + hours * 3600_000)
    const checkOut = isToday ? null : checkOutDate.toISOString()

    out.push({
      id: uid('att', out.length + 1),
      employeeId: employee.id,
      date,
      checkIn: checkIn.toISOString(),
      checkOut,
      status: deriveStatus(checkIn.toISOString(), checkOut),
    })
  }
  return out
}

const attendance = new Map<string, Attendance[]>()
for (const e of allUsers) attendance.set(e.id, seedAttendance(e, 30))

function daysFromToday(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

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

const LEAVE_REMARKS: Record<LeaveType, string[]> = {
  PAID: ['Family wedding out of town.', 'Personal travel, booked in advance.', 'Attending a family function.', 'Moving apartments this week.'],
  SICK: ['Fever and body ache.', 'Dental procedure, recovering at home.', 'Down with seasonal flu.', 'Follow-up doctor visit.'],
  UNPAID: ['Extended personal travel.', 'Family emergency back home.', 'Personal reasons.', 'Passport renewal, out of station.'],
}

const APPROVE_COMMENTS = ['Approved, get well soon.', 'Approved, enjoy the trip.', 'Approved — go ahead.', 'Sure, have a good one.']
const REJECT_COMMENTS = [
  'Team is short-staffed that week — can we look at alternate dates?',
  'Clashes with the release freeze, let’s reschedule.',
  'Too many overlapping requests already approved that week.',
]

let leaveSeq = 100
const leave: Leave[] = []

// Roughly 4 in 10 employees have an active or recent leave history — not everyone requests
// leave in any given window, which is itself realistic.
for (let i = 0; i < employees.length; i++) {
  const rand = rngFor(i * 31 + 7)
  if (rand() >= 0.44) continue

  const e = employees[i]
  const type: LeaveType = rand() < 0.45 ? 'PAID' : rand() < 0.7 ? 'SICK' : 'UNPAID'
  const duration = type === 'SICK' ? 1 + (rand() < 0.2 ? 1 : 0) : 1 + Math.floor(rand() * 4)

  // 15%: further back, into last year, always already decided — gives the year filter
  // something to actually filter. 60%: recent past, decided. 25%: near future, pending.
  const bucket = rand()
  let startOffset: number
  let status: LeaveStatus
  if (bucket < 0.15) {
    startOffset = -(200 + Math.floor(rand() * 200))
    status = rand() < 0.75 ? 'APPROVED' : 'REJECTED'
  } else if (bucket < 0.75) {
    startOffset = -(1 + Math.floor(rand() * 55))
    status = rand() < 0.7 ? 'APPROVED' : 'REJECTED'
  } else {
    startOffset = 1 + Math.floor(rand() * 21)
    status = 'PENDING'
  }

  const startDate = daysFromToday(startOffset)
  const endDate = daysFromToday(startOffset + duration - 1)
  const createdAt = new Date()
  createdAt.setDate(createdAt.getDate() + Math.min(startOffset, -1))

  const row: Leave = {
    id: uid('lv', ++leaveSeq),
    employeeId: e.id,
    type,
    startDate,
    endDate,
    remarks: pick(rand, LEAVE_REMARKS[type]),
    status,
    decisionById: status === 'PENDING' ? null : admin.id,
    comment: status === 'APPROVED' ? pick(rand, APPROVE_COMMENTS) : status === 'REJECTED' ? pick(rand, REJECT_COMMENTS) : null,
    createdAt: createdAt.toISOString(),
  }
  leave.push(row)
  if (status === 'APPROVED') markLeaveAttendance(row)
}
leave.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

const payroll = new Map<string, Payroll[]>()
for (const [i, e] of allUsers.entries()) {
  const level = i === 0 ? 2 : ROLES[i - 1].level // index 0 is admin
  const rand = rngFor(i * 17 + 3)
  const [minSalary, maxSalary] = LEVEL_SALARY_RANGE[level]
  const base = Math.round((minSalary + rand() * (maxSalary - minSalary)) / 500) * 500

  const joinedAt = new Date(e.createdAt)
  const tenureDays = Math.floor((Date.now() - joinedAt.getTime()) / 86400000)
  const rows: Payroll[] = [
    {
      id: uid('pay', i * 2 + 1),
      employeeId: e.id,
      baseSalary: base.toFixed(2),
      effectiveDate: toISODate(joinedAt),
      createdById: admin.id,
      createdAt: e.createdAt,
    },
  ]

  // Only employees with a year or more of tenure have earned an annual increment.
  if (tenureDays > 365) {
    const raiseDate = new Date(joinedAt)
    raiseDate.setFullYear(raiseDate.getFullYear() + 1)
    const raised = Math.round((base * (1.08 + rand() * 0.07)) / 500) * 500
    rows.push({
      id: uid('pay', i * 2 + 2),
      employeeId: e.id,
      baseSalary: raised.toFixed(2),
      effectiveDate: toISODate(raiseDate),
      createdById: admin.id,
      createdAt: raiseDate.toISOString(),
    })
  }

  payroll.set(e.id, rows)
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
    attendance.set(user.id, seedAttendance(user, 30))
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
