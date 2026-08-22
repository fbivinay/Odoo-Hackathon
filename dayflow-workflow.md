# Dayflow HRMS — Workflow & Single Source of Truth (2-person team)

*Every workday, perfectly aligned.*

This file is the execution checklist AND the architecture reference — schema, endpoints, and stack all live here so there's one place to check for changes. Frontend team: pull this file regularly, it will be updated as backend work lands.

**Team:** A = backend owner (`backend/`). B = frontend owner (`frontend/`). Neither edits the other's folder — if a change is needed on the other side, say it out loud and the owner makes it.

**Stack (locked):**
- Backend: Node.js + Express, Prisma ORM, PostgreSQL
- Auth: self-built — bcrypt password hashing, JWT access tokens, email verification via signed token link (no Clerk — PDF §3.1.1/3.1.2 requires custom sign-up/sign-in with Employee ID, so we own the whole flow)
- Validation: zod
- Security middleware: helmet, cors, express-rate-limit
- Frontend: React + Vite, Tailwind, shadcn/ui

---

## 0. Requirement coverage map

Every item below is copied from the PDF (§3.1–3.6) so you can tick it off directly against the brief, not against a paraphrase of it.

| PDF §  | Requirement | Owner | Build slot |
|---|---|---|---|
| 3.1.1 | Sign up (Employee ID, email, password, role) | A | 0:00–0:30 |
| 3.1.1 | Password security rules (min length, complexity via zod) | A | 0:00–0:30 |
| 3.1.1 | Email verification (token link, dev: log link to console) | A | 0:00–0:30 |
| 3.1.2 | Sign in, error messages, JWT issue, redirect to dashboard | A (API) + B (form + token storage) | 0:30–2:00 |
| 3.2.1 | Employee dashboard — quick-access cards (Profile, Attendance, Leave, Logout) + recent activity | B | 2:00–3:30 |
| 3.2.2 | Admin dashboard — employee list, attendance records, leave approvals, switch between employees | B | 4:00–5:30 |
| 3.3.1 | View profile — personal, job, salary, documents, photo | A (route) + B (page) | 0:30–2:00 |
| 3.3.2 | Edit profile — employee limited fields, admin all fields | A (route) + B (page) | 0:30–2:00 |
| 3.4.1 | Attendance tracking — daily/weekly view, check-in/out, status types | A (derivation logic) + B (view) | 0:30–2:00 |
| 3.4.2 | Attendance view — employee sees own, admin sees all | A (RBAC in query) | 0:30–2:00 / 4:00–5:30 |
| 3.5.1 | Apply for leave — type, date range, remarks, status | A + B | 2:00–3:30 |
| 3.5.2 | Leave approval — view all, approve/reject, comments, reflects immediately | A + B | 4:00–5:30 |
| 3.6.1 | Employee payroll view — read-only | A + B | 2:00–3:30 |
| 3.6.2 | Admin payroll control — view all, update salary structure | A + B | 4:00–5:30 |
| — | Email & notification alerts | **Cut** — see §6 | — |
| — | Analytics & reports dashboard | **Cut** — see §6 | — |

---

## 1. Data model (Prisma / PostgreSQL)

```prisma
enum Role {
  EMPLOYEE
  HR_ADMIN
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  HALF_DAY
  LEAVE
}

enum LeaveType {
  PAID
  SICK
  UNPAID
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
}

model Employee {
  id               String        @id @default(uuid())
  employeeId       String        @unique
  email            String        @unique
  passwordHash     String
  role             Role          @default(EMPLOYEE)
  name             String
  phone            String?
  address          String?
  photoUrl         String?
  jobTitle         String?
  department       String?
  emailVerified    Boolean       @default(false)
  verifyToken      String?
  verifyExpires    DateTime?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  attendance       Attendance[]
  leaveRequests    Leave[]       @relation("LeaveOwner")
  decidedLeaves    Leave[]       @relation("LeaveDecider")
  payrollRows      Payroll[]     @relation("PayrollOwner")
  createdPayroll   Payroll[]     @relation("PayrollCreator")
  auditLogs        AuditLog[]
}

model Attendance {
  id          String            @id @default(uuid())
  employeeId  String
  employee    Employee          @relation(fields: [employeeId], references: [id])
  date        DateTime          @db.Date
  checkIn     DateTime?
  checkOut    DateTime?
  status      AttendanceStatus  @default(ABSENT)

  @@unique([employeeId, date])
}

model Leave {
  id           String       @id @default(uuid())
  employeeId   String
  employee     Employee     @relation("LeaveOwner", fields: [employeeId], references: [id])
  type         LeaveType
  startDate    DateTime     @db.Date
  endDate      DateTime     @db.Date
  remarks      String?
  status       LeaveStatus  @default(PENDING)
  decisionById String?
  decisionBy   Employee?    @relation("LeaveDecider", fields: [decisionById], references: [id])
  comment      String?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model Payroll {
  id            String    @id @default(uuid())
  employeeId    String
  employee      Employee  @relation("PayrollOwner", fields: [employeeId], references: [id])
  baseSalary    Decimal   @db.Decimal(12, 2)
  effectiveDate DateTime  @db.Date
  createdById   String
  createdBy     Employee  @relation("PayrollCreator", fields: [createdById], references: [id])
  createdAt     DateTime  @default(now())
}

model AuditLog {
  id         String    @id @default(uuid())
  actorId    String
  actor      Employee  @relation(fields: [actorId], references: [id])
  action     String
  entity     String
  entityId   String
  meta       Json?
  createdAt  DateTime  @default(now())
}
```

Notes:
- Leave overlap prevention: application-level check (query existing PENDING/APPROVED leaves for the employee whose range intersects) inside a transaction — simpler than a Postgres exclusion constraint and portable to any hosted Postgres.
- Payroll is append-only — "current salary" = latest row by `effectiveDate` per employee.
- Every leave decision and payroll insert writes an `AuditLog` row in the same transaction.

---

## 2. API contract (locked — B builds mocks to this exact shape)

Response envelope: `{ ok: true, data }` on success, `{ ok: false, error, message }` on failure.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | none | employeeId, email, password, name — always creates role=EMPLOYEE; HR_ADMIN accounts are seeded or promoted via `PATCH /api/admin/employees/:id`, never via public signup |
| POST | `/api/auth/verify-email` | none | token from email link |
| POST | `/api/auth/signin` | none | returns JWT |
| GET | `/api/me` | employee | own profile |
| PATCH | `/api/me` | employee | limited fields only |
| POST | `/api/me/photo` | employee | multipart upload |
| POST | `/api/attendance/check-in` | employee | idempotent per employee+date |
| POST | `/api/attendance/check-out` | employee | |
| GET | `/api/attendance` | employee | own records, daily/weekly range param |
| POST | `/api/leave` | employee | apply |
| GET | `/api/leave` | employee | own requests |
| GET | `/api/payroll/me` | employee | read-only |
| GET | `/api/admin/employees` | admin | list + search |
| GET | `/api/admin/employees/:id` | admin | detail |
| PATCH | `/api/admin/employees/:id` | admin | edit any field |
| GET | `/api/admin/attendance` | admin | all employees, date param |
| GET | `/api/admin/leave` | admin | queue, filter by status |
| PATCH | `/api/admin/leave/:id` | admin | approve/reject + comment |
| POST | `/api/admin/payroll` | admin | new salary row |

Auth header: `Authorization: Bearer <JWT>`. JWT payload carries `{ sub: employeeId, role }`.

---

## 3. Pre-flight (before the clock starts, if possible)

- [ ] Repo created, both pushed with write access
- [ ] Postgres instance reachable by both (local or a shared cloud instance — shared is safer for two people, avoids "works on my machine" at hour 4)
- [ ] Node 20, npm agreed
- [ ] `.env` template shared (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`)

---

## 4. Hour-by-hour

### H+0:00 → 0:30 — Together, both people, no exceptions

- [ ] Confirm Prisma schema above, run `npx prisma migrate dev` against the shared DB
- [ ] Seed script — 1 admin, 8 employees, 30 days attendance, 5 leave requests in mixed states, 2 salary revisions
- [ ] Lock the response envelope and §2 endpoint table — **B copies these shapes into mock JSON, A builds to them literally**

Exit condition: both of you can run `npx prisma studio` and see seeded rows, and both have this file open.

---

### H+0:30 → 2:00 — Split

**A — backend**
- [ ] `src/middleware/auth.js`: `requireAuth`, `requireAdmin`, `assertOwnership`
- [ ] `src/services/authService.js`: signup (hash + verify token), verify-email, signin (compare + issue JWT)
- [ ] `src/services/employeeService.js`: profile get/edit (field allowlist by role)
- [ ] `src/services/attendanceService.js`: `deriveStatus()`, check-in/out (idempotent on `employee+date`)
- [ ] `src/routes/auth.js`, `src/routes/employees.js`, `src/routes/attendance.js`
- [ ] Live: all §2 non-admin auth/me/attendance endpoints

**B — frontend**
- [ ] Tailwind config with tokens (zinc neutral, indigo-600 accent, `rounded-lg`, Inter 400/500)
- [ ] shadcn init, pull in Button, Card, Table, Toast, Dialog, Skeleton
- [ ] `api.ts` — fetch wrapper, attaches JWT from storage, **mock responses copy-pasted from the locked envelope shapes**
- [ ] Sign-in/sign-up pages, JWT stored (httpOnly-cookie preferred; localStorage acceptable for hackathon scope)
- [ ] `components/AppShell.tsx` — sidebar, top bar, `ProtectedRoute`

Exit condition: A can sign up → verify → sign in and get a real JWT + employee row. B has a shell that renders and a nav that routes, running entirely on mocks.

---

### H+2:00 → 3:30 — Split

**A — backend**
- [ ] `src/services/leaveService.js` — apply, list own, overlap check (transactional query), state machine guard (`PENDING → APPROVED/REJECTED` only)
- [ ] `src/services/payrollService.js` — append-only insert, "current row" query
- [ ] `src/services/auditService.js` — record inside the same transaction as the mutation
- [ ] `src/routes/leave.js`, `src/routes/payroll.js`
- [ ] Live: `GET/POST /api/leave`, `GET /api/payroll/me`

**B — frontend** (all still on mocks)
- [ ] `components/StatusPill`, `EmptyState`, `DataTable`, `AttendanceRibbon` (build once, reuse everywhere)
- [ ] `pages/Dashboard.tsx` — quick-access cards per PDF §3.2.1, ribbon at top
- [ ] `pages/Profile.tsx` — view + edit, limited fields for employee
- [ ] `pages/Attendance.tsx` — daily/weekly toggle, check-in/out button, live elapsed timer
- [ ] `pages/Leave.tsx` — apply form (type, date range, remarks), own requests list with status pills

Exit condition: A's leave overlap check rejects a double-booked date in a manual test. B's four employee-facing pages render fully against mocks and look finished.

---

### H+3:30 → 4:00 — Together, both people

- [ ] Point `api.ts` base URL at A's real server
- [ ] Walk every one of B's pages against real data, fix shape mismatches live (budget the full 30 minutes for it)
- [ ] **Checkpoint:** sign up → verify → sign in → dashboard loads → apply for leave → (switch to admin session) approve it → (switch back) employee sees it reflected

If checkpoint isn't green by 4:00, stop and fix it before touching anything in §6. This is the one flow the whole brief hinges on.

---

### H+4:00 → 5:30 — Split

**A — backend**
- [ ] `src/routes/admin/employees.js` — list, search, detail, edit any field
- [ ] `src/routes/admin/attendance.js` — all employees for a given date
- [ ] `src/routes/admin/leave.js` — queue by status, decision endpoint (approve/reject + comment)
- [ ] `src/routes/admin/payroll.js` — new salary structure row
- [ ] `src/middleware/errors.js` — central envelope translator
- [ ] Live: everything under `/api/admin/*`

**B — frontend**
- [ ] `pages/admin/Dashboard.tsx` — employee list, attendance records, leave approvals per PDF §3.2.2
- [ ] `pages/admin/EmployeeList.tsx` — table with mini `AttendanceRibbon` per row, "switch between employees" detail view
- [ ] `pages/admin/AttendanceGrid.tsx` — all-employees, one day
- [ ] `pages/admin/LeaveQueue.tsx` — approve/reject with comment field
- [ ] `pages/admin/SalaryHistory.tsx` — current + history table

Exit condition: an admin session can see every employee, approve a leave with a comment, and post a new salary row.

---

### H+5:30 → 6:15 — Split, polish only, no new features

**A**
- [ ] Fix any response-shape gaps B surfaces
- [ ] Sanity-check every endpoint against §2 one more time
- [ ] Confirm audit rows are actually being written on leave decisions and payroll inserts
- [ ] Rate-limit `/api/auth/*`, confirm helmet/cors headers present

**B**
- [ ] Skeleton loaders replacing every spinner
- [ ] Optimistic approve + 5s undo toast on the leave queue
- [ ] Empty states on every table/list (icon + one line + action)
- [ ] Final pass on `AttendanceRibbon` colors/contrast in both roles

---

### H+6:15 → 7:00 — Together, code freeze

- [ ] Freeze — no more merges
- [ ] Write the demo script: sign up → verify → sign in as employee → dashboard → apply leave → sign in as admin → approve → back to employee → confirm reflected → admin salary update
- [ ] Rehearse the script twice against the seeded data, not against data you created live
- [ ] Confirm both laptops can run the demo independently (in case of a device issue)

---

## 5. Standing rules for the whole 7 hours

1. **Nobody edits the other's folder.** A change on the other side is requested out loud, made by its owner.
2. **B's mocks are contract-exact.** Field names and nesting copied from the locked §2 shapes, not approximated — this is what makes 3:30 a base-URL swap instead of a rewrite.
3. **Routes never touch Prisma directly. Services never touch `req`/`res`.** (A, enforced throughout — this is the thing a judge notices in thirty seconds of reading the code.)
4. **No feature work after 6:15.** Bugs found in rehearsal get fixed only if they're on the demo script's exact path.

---

## 6. Communication cadence

Given it's just the two of you, skip standups — but hit these four sync points without skipping:

| Time | What |
|---|---|
| 0:30 | Confirm both exit conditions above are actually met |
| 2:00 | Same |
| 3:30–4:00 | Full pairing session — this is not optional |
| 5:30 | Confirm checkpoint flow still works after admin features landed |

---

## 7. Cut list (in priority order, if time runs short)

1. **Payroll** (§3.6) — replace with one static salary card, hardcoded. Demos identically to a judge, saves ~45 min combined.
2. **Weekly attendance view** — keep daily only, drop the toggle.
3. **Admin salary update** — view-only payroll for admin too.
4. **Photo upload** — placeholder avatar, no `multer` route.

Never cut: sign up/verify/sign in, leave apply/approve flow, the checkpoint. That's the spine of the brief.
