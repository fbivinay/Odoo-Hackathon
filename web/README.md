# Web

React + Vite + TypeScript client for Dayflow HRMS.

## Requirements

- Node.js 20.19+ or 22.12+ (developed on Node 24)
- npm 10+

## Setup

From the repo root:

```bash
cd web
npm install
cp .env.example .env.local
```

## Run

```bash
npm run dev
```

Dev server starts on http://localhost:5173 with hot module replacement.

## Backend

The client talks to the live deployed backend by default — see `.env.example`.
Render's free tier sleeps after ~15 min idle; the first request after a gap
can take up to ~30s to wake it up. Hit `GET /health` a minute before a demo
to warm it up.

To point at a backend running locally instead, set in `.env.local`:

```
VITE_API_URL=http://localhost:4000/api
```

Set `VITE_USE_MOCKS=true` to run entirely against an in-memory mock backend
(`src/lib/mock.ts`) with no network calls — useful when the real backend is
down or you're working offline. The mock mirrors the real API's exact
response shapes, so no code changes are needed either way.

## Other scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | Lint with oxlint |

## Layout

```
web/
├── index.html
├── vite.config.ts
├── components.json     # shadcn/ui config
├── public/
└── src/
    ├── main.tsx / App.tsx
    ├── auth/            # session context, protected routes, JWT storage
    ├── components/      # AppShell, DataTable, AttendanceRibbon, shared UI
    │   ├── ui/          # shadcn/ui primitives
    │   └── tremor/      # KPI cards, bar lists
    ├── pages/           # employee views, admin/ views, auth/ views
    ├── lib/             # api.ts (fetch wrapper), mock.ts, format.ts, etc.
    └── types.ts         # API response types
```

## Auth

Custom JWT auth (no Clerk) — `POST /api/auth/signin` returns a token stored
in `localStorage`, attached as `Authorization: Bearer <token>` on every
subsequent request. See `src/lib/token.ts` and `src/auth/session.tsx`.
