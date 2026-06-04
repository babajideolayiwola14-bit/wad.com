# Web Chat Application

Nigeria location-based chat for posting **what you want done** (action requests), scoped by State and LGA.

## Stack

- **Runtime:** Node.js + Express (`src/server.js`)
- **Database:** PostgreSQL only (`DATABASE_URL`)
- **Deploy:** [Render](https://render.com) (`render.yaml`)
- **Realtime:** Socket.io
- **Frontend:** `public/` (static HTML/CSS/JS)

## Project layout

```
├── public/           # Static UI (index, admin, css, js)
├── src/              # Server + DB layer
├── scripts/          # One-off maintenance utilities
├── docs/             # Security & deployment notes (legacy)
├── uploads/          # User attachments (gitignored)
├── package.json
└── render.yaml
```

## Local development

1. `npm install`
2. Copy `.env.example` → `.env` and set `DATABASE_URL` (Render Postgres URL or local Postgres).
3. `npm run dev`
4. Open `http://localhost:3001`

## Render deployment

1. Connect repo to Render (or use Blueprint from `render.yaml`).
2. Create/link a **PostgreSQL** database; Render sets `DATABASE_URL` automatically.
3. Set environment variables: `SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `APP_URL`, `CORS_ORIGIN`, SMTP vars if using email reset.
4. Deploy — build: `npm install`, start: `npm start`.

## Scripts

Maintenance tools live in `scripts/` (DB checks, migrations). They expect `DATABASE_URL` in the environment.

## Documentation

Older security/deployment guides are in `docs/`. Start with this README for day-to-day work.
