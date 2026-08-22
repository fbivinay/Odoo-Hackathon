# Backend — Dayflow HRMS

Node.js + Express + Prisma + PostgreSQL. Stack and API contract are documented in full in `../dayflow-workflow.md` — treat that file as the single source of truth for endpoint shapes.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Server runs on `http://localhost:4000` by default. Health check: `GET /health`.

Seeded login: `admin@dayflow.dev` / `Password123` (HR_ADMIN), `employee1@dayflow.dev` ... `employee8@dayflow.dev` / `Password123`.

## Structure

```
src/
  app.js            # express app, middleware, route mounting
  server.js          # entrypoint
  routes/            # thin — parse/validate, call services, shape response
  routes/admin/       # admin-only routes, mounted behind requireAuth + requireAdmin
  services/          # all business logic and Prisma calls
  middleware/        # auth, error handling, async wrapper
  validators/        # zod schemas
  lib/               # prisma client, error helpers
prisma/
  schema.prisma
  seed.js
```

Rule: routes never touch Prisma directly, services never touch `req`/`res`.

## Auth

Self-built JWT auth (no third-party auth provider): sign up → email verification token (logged to console in dev, no email provider wired up) → sign in issues a JWT. Send it as `Authorization: Bearer <token>`.
