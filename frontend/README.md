# Frontend

React + Vite client for the Odoo Hackathon project.

## Requirements

- Node.js 20.19+ or 22.12+ (developed on Node 24)
- npm 10+

## Setup

From the repo root:

```bash
cd frontend
npm install
```

## Run

```bash
npm run dev
```

Dev server starts on http://localhost:5173 with hot module replacement.

## Other scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | Lint with oxlint |

## Layout

```
frontend/
├── index.html        # Vite entry HTML
├── vite.config.js    # Vite config
├── public/           # Static assets served as-is
└── src/
    ├── main.jsx      # App bootstrap
    ├── App.jsx       # Root component
    └── assets/       # Assets imported by components
```

## Talking to the backend

The backend lives in `../backend`. Point the client at it with a `.env.local`
file in this folder (git-ignored):

```
VITE_API_URL=http://localhost:8000
```

Read it in code via `import.meta.env.VITE_API_URL`. Only variables prefixed
with `VITE_` are exposed to the browser bundle.

To avoid CORS during development, you can instead proxy through Vite by adding
to `vite.config.js`:

```js
server: {
  proxy: { '/api': 'http://localhost:8000' }
}
```
