# Handoff: shift field + 150-person realistic seed

Everything here is generated content for the backend owner to apply — nothing in `backend/`
was touched. `backend-seed-handoff.js` (same folder as this file) has been run against a
mocked Prisma client and verified: 151 unique employees (1 admin + 150), zero duplicate
IDs/emails/names, correct 50/50/50 shift split, 3125 valid attendance rows, 59 leave
requests spanning two years, 249 payroll rows, no bad dates or NaN values.

## 1. Schema change — add `shift`

In `backend/prisma/schema.prisma`, add one field to `Employee` (plain nullable string,
same pattern as `department`/`jobTitle` — not an enum, so the frontend's fixed 3-value
dropdown is the only thing constraining it, exactly like department already works):

```prisma
model Employee {
  ...
  jobTitle      String?
  department    String?
  shift         String?   // "Shift 1" | "Shift 2" | "Shift 3"
  emailVerified Boolean   @default(false)
  ...
}
```

Then run inside `backend/`:

```
npx prisma migrate dev --name add_employee_shift
```

## 2. Validators — accept `shift`

`backend/src/validators/employeeValidators.js` — add `shift: z.string().optional()` to
both schemas:

```js
const inviteSchema = z.object({
  employeeId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['EMPLOYEE', 'HR_ADMIN']).default('EMPLOYEE'),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  shift: z.string().optional(),
});

const adminEditSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  photoUrl: z.string().url().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  shift: z.string().optional(),
  role: z.enum(['EMPLOYEE', 'HR_ADMIN']).optional(),
});
```

## 3. Service — return and accept `shift`

`backend/src/services/employeeService.js`:

- `PUBLIC_FIELDS`: add `shift: true,` next to `department: true,`.
- `invite({ employeeId, email, name, role, jobTitle, department })` → add `shift` to the
  destructured params and to the `data: {...}` object passed to `prisma.employee.create`.

That's the whole schema/API side. `updateAsAdmin` and `getById` already pass through
whatever's in `PUBLIC_FIELDS`, so no other changes needed.

## 4. Seed data — 150 employees, 3 shifts of 50

`backend-seed-handoff.js` is a complete, ready-to-use replacement for
`backend/prisma/seed.js`. Same generator that's already live in `web/src/lib/mock.ts`,
translated to this project's Prisma/seed style:

- 150 real, distinct Indian names, no duplicates (checked at runtime — throws on load if
  broken)
- Split 50/50/50 across Shift 1 / Shift 2 / Shift 3, each shift independently covering
  all 7 departments (a 24/7 operation staffing the same roles round the clock)
- Designation follows a seniority pyramid per department (e.g. Engineering: 8 engineers →
  5 senior → 2 staff → 1 manager), matching `web/src/lib/orgStructure.ts` exactly so
  manually-added employees and seeded ones never drift apart
- Join dates correlate with seniority (managers hired 2–4 years ago, ICs more recently)
- Attendance: nobody has rows before their join date, Mon/Fri run slightly more absent
  than midweek, and check-in hour follows the employee's shift (6am / 2pm / 10pm) instead
  of a flat 9am for everyone
- Leave: ~44% of employees have a request, spanning two calendar years so a year filter
  has real data to show
- Payroll: hire-date base salary banded by seniority level, with a raise row only for
  employees who've actually completed a year

**Before you run it — this is destructive.** The script opens with:

```js
await prisma.auditLog.deleteMany({});
await prisma.attendance.deleteMany({});
await prisma.leave.deleteMany({});
await prisma.payroll.deleteMany({});
await prisma.employee.deleteMany({});
```

It wipes every employee currently in the database — including any test accounts invited
by hand through the app — before writing the new 150. It has to: `employeeId` and `email`
are unique, and this script always writes `EMP-0000`..`EMP-0150`, so re-running it without
clearing first would fail on the first conflict. Confirm with whoever's been testing
against the shared DB before running, and expect to re-invite any manually-created test
accounts afterward.

To apply: back up or diff `backend/prisma/seed.js`, replace its contents with
`backend-seed-handoff.js`, then run:

```
npx prisma db seed
```

Login after seeding: `admin@dayflow.dev` (admin) or any
`firstname.lastname@dayflow.dev` (e.g. `aarav.sharma@dayflow.dev`) — all `Password123`.

## 5. Once this lands

The frontend already has the shift UI built and waiting (Add Employee dialog, edit form,
list column, list filter) — it just sends/receives an ignored field until steps 1–3 ship.
No frontend changes needed after this; it'll start working the moment the API returns
`shift` in responses.
