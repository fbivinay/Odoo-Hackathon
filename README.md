# Dayflow HRMS

> **Demo Logins**
>
> | Role | Email | Password |
> |---|---|---|
> | Employer (HR admin) | `admin@dayflow.dev` | `Password123` |
> | Employee | `aditya.verma@dayflow.dev` | `Password123` |

Human Resource Management System — Odoo Hackathon project.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| Backend | Node.js + Express + Prisma ORM |
| Database | PostgreSQL on [Neon](https://neon.tech) |
| Hosting | Frontend → Vercel · Backend → Node host |

## Local Setup

### Backend
```bash
cd backend
cp .env.example .env   # Add DATABASE_URL (Neon) and JWT_SECRET
npm install
npx prisma generate && npx prisma migrate dev
npm run dev            # http://localhost:3000
```

### Frontend
```bash
cd web
cp .env.example .env   # Set VITE_API_URL=http://localhost:3000
npm install
npm run dev            # http://localhost:5173
```

## Deployment

- **Frontend** → Import `web/` into Vercel, set `VITE_API_URL` env var.
- **Backend** → Deploy to any Node host (Railway, Render, Fly.io), set `DATABASE_URL` + `JWT_SECRET`.
- **Database** → Get connection string from Neon Console. Run `npx prisma migrate deploy` in CI.

## Structure

```
dayflow-hrms/
├── backend/   # Express API, Prisma schema, migrations
└── web/       # React + Vite frontend
```
