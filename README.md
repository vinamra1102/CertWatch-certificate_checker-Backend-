# CertWatch — Backend

[![CI](https://github.com/vinamra1102/CertWatch-certificate_checker-Backend-/actions/workflows/ci.yml/badge.svg)](https://github.com/vinamra1102/CertWatch-certificate_checker-Backend-/actions/workflows/ci.yml)

REST API for **CertWatch**, a multi-user SSL/TLS certificate monitoring service.
Users register, add domains they own, and get cert issuer + expiry + days
remaining for each — plus a daily auto-recheck via cron.

**Frontend lives in a separate repo:** [CertWatch-certificate_checker-Frontend-](https://github.com/vinamra1102/CertWatch-certificate_checker-Frontend-)

**Live API:** https://certwatch-backend-production-aa73.up.railway.app
**API docs (Swagger UI):** https://certwatch-backend-production-aa73.up.railway.app/api/docs

---

## Tech Stack

- **Node 20** · **Express 5** · **TypeScript** (strict mode)
- **Prisma 6** + **SQLite** (persistent volume in production)
- **Zod** for env, request body, and query validation
- **bcryptjs** + **jsonwebtoken** for auth (HS256, 7-day TTL)
- **ssl-checker** for TLS handshake + leaf-cert parsing
- **Pino** + **pino-http** for structured JSON logging
- **node-cron** for daily certificate re-checks
- **Helmet** + **express-rate-limit** for hardening
- **Jest** + **Supertest** for integration tests
- **GitHub Actions** for CI

---

## Quick Start (local)

Requires Node 20+ and npm.

```bash
git clone https://github.com/vinamra1102/CertWatch-certificate_checker-Backend-.git
cd CertWatch-certificate_checker-Backend-

# 1. Set up environment
cp .env.example .env
# Open .env and set JWT_SECRET to a 32+ char random string,
# e.g. `openssl rand -base64 48`

# 2. Install + migrate + run
npm install
npx prisma migrate dev
npm run dev          # http://localhost:5000
```

`/health` should return `{"success":true,"status":"healthy","db":"ok"}`.

### Available scripts

| Script             | What it does                                                          |
|--------------------|-----------------------------------------------------------------------|
| `npm run dev`      | Hot-reloading dev server via `ts-node-dev`                            |
| `npm run build`    | Compile TypeScript to `dist/`                                         |
| `npm start`        | Run compiled output                                                   |
| `npm run start:prod` | `prisma migrate deploy && node dist/server.js` (used in production) |
| `npm test`         | Run all 11 Jest integration tests against an isolated SQLite          |

---

## Environment Variables

| Variable          | Required | Default                                | Notes                                          |
|-------------------|----------|----------------------------------------|------------------------------------------------|
| `DATABASE_URL`    | yes      | —                                      | `file:./dev.db` locally, `file:/data/prod.db` on Railway |
| `JWT_SECRET`      | yes      | —                                      | 32+ chars; generate with `openssl rand -base64 48` |
| `JWT_EXPIRES_IN`  | no       | `7d`                                   | Any [ms](https://github.com/vercel/ms) duration |
| `CORS_ORIGIN`     | no       | `http://localhost:3000`                | Comma-separated allowlist of frontend origins  |
| `NODE_ENV`        | no       | `development`                          | `development` \| `production` \| `test`        |
| `PORT`            | no       | `5000`                                 | Server listens on this port                    |

Env is parsed and validated by Zod at startup — the server refuses to boot on missing/invalid config.

---

## Project Structure

```
src/
├── config/       env.ts (Zod-validated), db.ts (Prisma singleton), logger.ts (Pino)
├── types/        Shared interfaces (JwtPayload, ApiResponse, AuthRequest)
├── middleware/   auth.ts (JWT), validate.ts (Zod factory), errorHandler.ts
├── validators/   Per-route Zod schemas (auth, monitor, pagination)
├── services/     auth.service, cert.service, monitor.service (userId-scoped)
├── controllers/  auth.controller, monitor.controller
├── routes/       auth.routes, monitor.routes
├── jobs/         certChecker.job.ts (node-cron @ 02:00 daily)
├── docs/         openapi.ts (OpenAPI 3.0.3 spec served at /api/docs)
├── app.ts        createApp() — middleware + routes wired together
└── server.ts     boots app, listens, starts scheduler, graceful SIGTERM
prisma/           schema.prisma + migrations/
tests/            globalSetup, mocked cert.service, 11 integration tests
```

---

## API Endpoints

| Method | Path                          | Auth | Notes                                              |
|--------|-------------------------------|------|----------------------------------------------------|
| GET    | `/`                           | —    | Welcome banner                                     |
| GET    | `/health`                     | —    | Liveness + DB ping (503 if DB unreachable)         |
| POST   | `/api/auth/register`          | —    | Body `{ email, password }` → JWT                   |
| POST   | `/api/auth/login`             | —    | Body `{ email, password }` → JWT                   |
| GET    | `/api/monitors?page=&limit=`  | ✓    | Paginated list with `{ data, meta }`               |
| POST   | `/api/monitors`               | ✓    | Body `{ domain }` — runs immediate SSL check       |
| GET    | `/api/monitors/:id`           | ✓    | Single monitor                                     |
| DELETE | `/api/monitors/:id`           | ✓    | Remove monitor                                     |
| POST   | `/api/monitors/:id/check`     | ✓    | Trigger on-demand re-check                         |
| GET    | `/api/docs`                   | —    | Swagger UI                                         |
| GET    | `/api/docs.json`              | —    | Raw OpenAPI 3.0.3 spec                             |

Auth uses `Authorization: Bearer <JWT>` headers.

### Data model

```prisma
enum MonitorStatus { ACTIVE EXPIRED ERROR UNKNOWN }

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String                       // bcrypt hash, never plaintext
  monitors  Monitor[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Monitor {
  id             String        @id @default(cuid())
  domain         String
  status         MonitorStatus @default(UNKNOWN)
  issuer         String?
  expiryDate     DateTime?
  daysRemaining  Int?
  lastCheckedAt  DateTime?
  userId         String
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  @@unique([userId, domain])             // two users can monitor the same domain independently
}
```

---

## Scheduled Job

`src/jobs/certChecker.job.ts` registers a `node-cron` task at `0 2 * * *`
(daily 02:00 server time) that iterates every Monitor in the DB and re-runs
`ssl-checker` against each. Logged with `{ checked, updated, durationMs }`.
Skipped when `NODE_ENV=test`.

---

## Tests

```bash
npm test
```

11 integration tests via Jest + Supertest:
- Spins up a fresh SQLite (`prisma/test.db`) in `globalSetup`
- `cert.service` is **mocked** — tests never make real network calls
- Covers register/login/duplicate-email/weak-password/invalid-creds
- Covers full monitor CRUD, per-user scoping, invalid domain, `/health`

---

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main`
and every PR: install → `prisma generate` → `prisma migrate deploy` →
`tsc --noEmit` → `npm run build` → `npm test`.

---

## Deployment

The full step-by-step is in [DEPLOYMENT.md](./DEPLOYMENT.md). Short version:

- **Hosted on:** [Railway](https://railway.app) (container + 500 MB persistent volume mounted at `/data`)
- **Why not Vercel:** SQLite needs persistent storage and `node-cron` needs a long-running process — neither works on serverless
- **Auto-deploy:** every push to `main` triggers a fresh build; migrations apply automatically via `start:prod`

---

## License

ISC
