# Deployment

CertWatch backend is a stateful Express service with a SQLite database and a
`node-cron` job. It needs a host that provides:

- A long-running Node.js process (not serverless)
- A persistent disk for the SQLite file
- HTTPS termination and a public hostname

Two recommended options below. **Fly.io** is the suggested default — best
free-tier story for SQLite apps. **Railway** is the simpler UI alternative.

---

## Option A — Fly.io (recommended)

Fly.io runs containers on tiny VMs with attachable volumes. Free tier covers
this app comfortably.

### One-time setup

1. Install the CLI and sign in:
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth signup    # or: fly auth login
   ```

2. From the project root, launch the app (do not deploy yet):
   ```bash
   fly launch --no-deploy
   ```
   - Pick a unique app name (e.g. `certwatch-backend-<yourname>`)
   - Pick a region close to you
   - When asked about Postgres / Redis / deploy now → answer **no**
   - Fly will detect the existing `Dockerfile` and `fly.toml` and update
     `app = ...` in `fly.toml` with the name you chose

3. Create the persistent volume for SQLite (same region as the app):
   ```bash
   fly volumes create certwatch_data --size 1 --region <your-region>
   ```
   The volume name **must match** `[[mounts]].source` in `fly.toml`.

4. Set production secrets (these are encrypted, not stored in `fly.toml`):
   ```bash
   fly secrets set \
     DATABASE_URL="file:/data/prod.db" \
     JWT_SECRET="$(openssl rand -base64 48)" \
     JWT_EXPIRES_IN="7d" \
     CORS_ORIGIN="https://your-frontend.vercel.app"
   ```

### Deploy

```bash
fly deploy
```

The container boots, `prisma migrate deploy` runs against the volume-mounted
SQLite file, then the server starts. Visit `https://<app>.fly.dev/health` and
you should see `{"status":"healthy","db":"ok"}`.

### Subsequent deploys

```bash
git push origin main   # update code
fly deploy             # ship it
```

Migrations apply automatically on each boot (see `start:prod` script).

---

## Option B — Railway

Railway gives you a simpler dashboard but volumes require the $5/mo Hobby plan.

1. Create a new project from the GitHub repo at <https://railway.app>.
2. Railway detects the `Dockerfile` and builds automatically.
3. Add a **Volume** to the service, mounted at `/data`.
4. Set environment variables (Variables tab):
   ```
   DATABASE_URL=file:/data/prod.db
   JWT_SECRET=<output of: openssl rand -base64 48>
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://your-frontend.vercel.app
   NODE_ENV=production
   PORT=5000
   ```
5. Under **Settings → Networking** enable a public domain.
6. Trigger a deploy. Check `/health`.

---

## After deploy — wire the frontend

In your Vercel/Netlify dashboard, set on the frontend:

```
NEXT_PUBLIC_API_URL=https://<your-backend>.fly.dev
```

Then add the frontend's URL to backend `CORS_ORIGIN` (comma-separate multiple):

```bash
fly secrets set CORS_ORIGIN="https://your-frontend.vercel.app,https://www.yourdomain.com"
```

---

## Verifying production

```bash
# Health check (DB ping included)
curl https://<your-backend>.fly.dev/health

# Try registering
curl -X POST https://<your-backend>.fly.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'

# Swagger / OpenAPI docs are live too:
open https://<your-backend>.fly.dev/api/docs
```

---

## Backup tip

The SQLite file lives at `/data/prod.db` on the volume. To pull a snapshot:

```bash
# Fly
fly ssh console
sqlite3 /data/prod.db ".backup '/data/backup-$(date +%F).db'"
fly sftp get /data/backup-2026-06-08.db ./
```

For a hands-off backup, consider adding [Litestream](https://litestream.io/)
later — it streams SQLite WAL changes to S3 / B2 continuously.

---

## Why this app cannot deploy to Vercel

Vercel runs every endpoint as a stateless serverless function:

- SQLite needs persistent local storage — serverless functions have no
  writable filesystem between invocations.
- The `node-cron` daily checker needs a long-running process — serverless
  functions terminate after each request.
- Express middleware ordering doesn't map cleanly to per-route lambdas.

Deploy the **frontend** to Vercel; deploy this backend to Fly/Railway.
