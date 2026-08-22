# Backend handoff: spec gaps + production hardening

Not code — a spec for the backend owner to build against. Ordered by what actually blocks
the PDF requirements (§3.3, §3.6, cut list) vs. what's pure hardening for scale.

Two items below need a decision from Vinay before work starts, not just backend's call —
marked **NEEDS DECISION**.

---

## 1. Salary slips / payslips (spec §3.6, named explicitly)

MVP first, PDF later — don't start with PDF generation, it's the slow path for no reason.

**`GET /api/payroll/me/slip?month=&year=`** (employee, own record only)
**`GET /api/admin/payroll/:employeeId/slip?month=&year=`** (admin, any employee)

Both return the same shape:

```json
{
  "ok": true,
  "data": {
    "employee": { "name": "...", "employeeId": "EMP-0001", "department": "...", "jobTitle": "..." },
    "payPeriod": { "month": 8, "year": 2026 },
    "baseSalary": "72000.00",
    "effectiveDate": "2026-04-01"
  }
}
```

Logic: same "current salary" query already used elsewhere — the latest `Payroll` row
where `effectiveDate <= <last day of requested month>`. No new model needed.

**PDF generation is a stretch goal, not the MVP.** Ship the JSON endpoint; the frontend
can render a print-friendly page and let the browser's own print-to-PDF handle it. Only
build real server-side PDF (`pdfkit` — lightweight, no headless browser) if there's time
left at the end.

---

## 2. Notifications — build in-app first, email second

Split this into two halves. The first needs zero external accounts and should just get
built; the second is the one that needs a decision.

### 2a. In-app notifications (no decision needed, start anytime)

```prisma
model Notification {
  id         String   @id @default(uuid())
  employeeId String
  employee   Employee @relation(fields: [employeeId], references: [id])
  message    String
  read       Boolean  @default(false)
  createdAt  DateTime @default(now())
}
```

- Write one row inside the leave-decision transaction (`leaveService.decide()`, same
  transaction that already writes the `AuditLog` row) — e.g. `"Your leave request for
  Aug 24–26 was approved."`
- `GET /api/me/notifications` — own notifications, newest first
- `PATCH /api/me/notifications/:id/read` — mark one read

Frontend already has nowhere to show these — a bell icon in `AppShell.tsx` is the
natural spot, built the moment this endpoint exists.

### 2b. Email — **NEEDS DECISION**

`backend/package.json` has no mail library at all today — this is greenfield. Before
backend writes a line of this, decide together:
- **Provider**: Resend is the easiest fit for a Node/Express app (simple API, generous
  free tier, minutes to wire up). SendGrid works too but is more setup for no extra
  benefit at this scale.
- **Who owns the account/API key** — whoever signs up holds the key, goes in `.env` as
  `RESEND_API_KEY` (or equivalent), never committed.

Once decided, backend needs: the provider SDK as a dependency, a `mailService.js` with
one function (`sendLeaveDecisionEmail`), called from the same spot as 2a's in-app
notification — non-blocking, wrapped so an email failure never fails the actual leave
decision request.

---

## 3. Signup / email-verification — decision, not a build task

The original spec assumes self-serve signup with email verification. That flow was
fully deleted in favor of admin-invite-only (closed a real privilege-escalation hole —
correct call). Two honest paths, pick one:

- **Keep invite-only.** No work. Just know it's a documented, deliberate deviation from
  the PDF spec if a judge asks — not a bug.
- **Bring self-serve signup back.** Rides entirely on 2b's email provider (verification
  links are just another email). Don't build this before the provider decision above.

---

## 4. Pagination on `GET /api/admin/employees`

Currently an unbounded `findMany` — fine at ~150 seeded rows, won't stay fine.

Add `?page=&limit=` (default `limit=25` — matches the frontend's current client-side
page size exactly, so the swap is a one-line change on the frontend, not a redesign).
Keep the envelope shape intact by nesting pagination inside `data`:

```json
{ "ok": true, "data": { "items": [...], "total": 187, "page": 1, "limit": 25 } }
```

---

## 5. Missing indexes

Only unique constraints exist today; none of the three hot query paths are indexed:

```prisma
model Leave {
  ...
  @@index([status])
}
model Attendance {
  ...
  @@index([date])
}
model Payroll {
  ...
  @@index([employeeId, effectiveDate])
}
```

`@@unique([employeeId, date])` on `Attendance` does **not** help a plain
`WHERE date = $1` query (Postgres can't use a composite index efficiently when the
leading column isn't in the filter) — that's why `date` needs its own index despite the
existing unique constraint.

`npx prisma migrate dev --name add_performance_indexes` after adding these.

---

## 6. Object storage for photos + documents — **NEEDS DECISION**

`multer` writes profile photos to `backend/uploads/` on local disk. Render's filesystem
is ephemeral — every deploy or restart wipes it, so every uploaded photo silently
disappears. Same problem will hit the documents feature below the moment it exists.

Decide together: **Cloudflare R2** (S3-compatible API, free egress, generous free tier —
usually the best fit for a project this size) vs. **AWS S3** vs. **Vercel Blob**. Whoever
owns the account holds the credentials.

Once decided: swap `multer`'s disk storage for the provider's SDK (or `multer-s3` for
an S3-compatible target), store the returned URL in `photoUrl` exactly as today —
frontend needs zero changes, it already just renders whatever URL comes back.

---

## 7. Documents feature (spec §3.3.1 — "Documents" under View Profile)

Nothing exists yet — new model and routes. Blocked on item 6 (storage decision) since
documents need the same durable storage as photos; build both on the same provider at
the same time rather than doing this piece twice.

```prisma
model Document {
  id           String   @id @default(uuid())
  employeeId   String
  employee     Employee @relation(fields: [employeeId], references: [id])
  name         String
  url          String
  uploadedById String
  uploadedAt   DateTime @default(now())
}
```

- `POST /api/me/documents` — self-upload (ID proof, etc.)
- `GET /api/me/documents` — own list
- `GET /api/admin/employees/:id/documents` — admin view of anyone's
- `DELETE /api/me/documents/:id` or admin-equivalent, if removal is in scope

Frontend has nothing to build against until this exists — this is backend-first, no
mock-ahead possible without guessing the shape.

---

## Suggested order

1. Indexes (§5) — ten minutes, zero risk, do it regardless of everything else
2. Pagination (§4) — small, no dependencies
3. Payslip MVP (§1) — no dependencies, real spec gap
4. In-app notifications (§2a) — no dependencies, real spec gap
5. Storage + email provider decisions (§2b, §6) — get these decided in parallel with 1-4
   so items 3 (if reversing signup), 6, 7 aren't blocked once 1-4 are done
