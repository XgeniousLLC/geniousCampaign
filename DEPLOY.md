# Deploying geniusCampaign

Two supported paths: **Docker** (recommended — the fastest way to get a production instance running) or **manual** (build the two apps yourself and run them with your own process manager / reverse proxy).

Either way, you need real accounts/credentials for the integrations you plan to use — see [Environment variables](#environment-variables) below. Nothing works with fake/placeholder credentials; every send/verify/upload call hits the real provider.

## Docker

### Prerequisites

- Docker + Docker Compose v2 (`docker compose version`)
- A domain or IP address your users and browsers can reach the API and web containers on

### 1. Configure environment

```bash
cp .env.example .env
```

Fill in at minimum:

- `JWT_SECRET` — `openssl rand -hex 32`
- `POSTGRES_PASSWORD` — a real password for the bundled Postgres container (defaults to `geniuscampaign` if left blank — change this for anything beyond local testing)
- `VITE_API_BASE_URL` — the URL the **browser** will use to reach the API (e.g. `https://api.yourdomain.com` or `http://your-server-ip:3000`). This is baked into the frontend at **build** time (Vite), not read at runtime — if you change it, you must rebuild the `web` image.

Everything else in `.env.example` (AWS SES, Cloudflare R2, Gmail OAuth, Reoon/NeverBounce, OpenAI/DeepSeek, Slack) can be left blank and configured later from the running app's **Settings > Integrations** page — those are stored encrypted in the database and override `.env` immediately, no restart needed.

If any of the default host ports (`5432`, `6379`, `3000`, `8080`) are already in use on your machine — common if you also run Postgres/Redis locally for non-Docker development — override them in `.env`: `POSTGRES_PORT`, `REDIS_PORT`, `API_PORT`, `WEB_PORT`. The container-internal ports never change, only which host port they're published on.

### 2. Build and start

```bash
docker compose build
docker compose up -d
```

This starts four containers: `postgres`, `redis`, `api` (NestJS, port 3000), and `web` (nginx serving the built React app, port 8080). Postgres and Redis data persist in named Docker volumes across restarts.

### 3. Run migrations

The database schema isn't created automatically on first boot — run migrations once after the containers are up:

```bash
docker compose exec api npm run db:migrate
```

Re-run this same command after pulling any update that includes new migrations.

### 4. Verify

- API health: `curl http://localhost:3000/auth/login` should return a 400 (missing body), not a connection error.
- Web: open `http://localhost:8080` (or wherever you've mapped port 80 of the `web` container) — you should see the sign-in page.
- Register the first account through the UI — the first user ever registered becomes `owner` automatically.

### Updating

```bash
git pull
docker compose build
docker compose up -d
docker compose exec api npm run db:migrate
```

### Stopping / removing

```bash
docker compose down          # stops containers, keeps volumes (data preserved)
docker compose down -v       # also deletes postgres/redis volumes — destroys all data
```

## Manual deployment (no Docker)

### Prerequisites

- Node.js 22+
- PostgreSQL 14+ and Redis 6+, reachable from wherever the API process runs
- A process manager (pm2, systemd, etc.) and a reverse proxy (nginx, Caddy) if you want TLS/a single public port

### 1. Build

```bash
npm ci
npm run build --workspace packages/shared
npm run build --workspace apps/api
npm run build --workspace apps/web
```

`apps/api/dist` is the compiled NestJS server; `apps/web/dist` is a static SPA build.

### 2. Configure environment

Same as the Docker path — copy `.env.example` to `.env` at the repo root, fill in `JWT_SECRET` and `DATABASE_URL`/`REDIS_URL` pointing at your real Postgres/Redis instances, and `VITE_API_BASE_URL` **before** the `apps/web` build above (it's baked in at build time — rebuild the web app if this changes).

### 3. Migrate

```bash
npm run db:migrate --workspace apps/api
```

### 4. Run the API

```bash
node apps/api/dist/main
# or, with pm2:
pm2 start apps/api/dist/main --name geniuscampaign-api
```

Listens on `PORT` (default 3000).

### 5. Serve the web app

`apps/web/dist` is a static SPA — serve it with any static file server that supports an SPA fallback (unknown paths → `index.html`). Example nginx server block:

```nginx
server {
  listen 80;
  server_name yourdomain.com;
  root /path/to/geniusCampaign/apps/web/dist;

  location / {
    try_files $uri /index.html;
  }
}
```

Put the API behind its own subdomain/port (`api.yourdomain.com` or `yourdomain.com:3000`) — whatever you set `VITE_API_BASE_URL` to at build time.

## Environment variables

Every variable is documented with inline comments in `.env.example`. Summary by feature area — leave a section blank if you don't need that feature yet; the app degrades gracefully and marks the corresponding ticket/feature as blocked rather than faking success:

| Area | Variables | Required for |
|---|---|---|
| Core | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `PORT` | Everything |
| Frontend | `VITE_API_BASE_URL` | Web app to reach the API (build-time) |
| AWS SES | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_CONFIGURATION_SET`, `SES_FROM_EMAIL` | Primary/bulk email sending |
| Cloudflare R2 | `CLOUDFLARE_R2_*` | Template editor image uploads |
| Tracking | `TRACKING_SIGNING_SECRET` | Open/click tracking, unsubscribe links |
| Gmail Workspace | `GOOGLE_OAUTH_*`, `ADMIN_APP_URL`, `TOKEN_ENCRYPTION_KEY`, `GMAIL_DEFAULT_DAILY_LIMIT` | Rotated secondary sender accounts |
| Verification | `REOON_API_KEY`, `NEVERBOUNCE_API_KEY` | Bulk email verification |
| Webhooks | `OUTBOUND_WEBHOOK_HMAC_SECRET` | Outbound webhook signing |
| Slack | `SLACK_WEBHOOK_URL` | Circuit-breaker / large-send notifications |
| AI-assisted copy | `LLM_PROVIDER`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY` | Template editor AI Assist |

All of the above (except the core/frontend rows) can also be set from **Settings > Integrations** in the running app instead of `.env` — that's usually the easier path once the instance is up.

Two of these have a different setup path than the rest:

- **Open/click tracking domain** (`TRACKING_DOMAIN`) is deliberately **not** an `.env` field at all — it's DB-only, set from Settings > Integrations > "Open/click tracking." Type the domain, click "Check DNS" — the app shows you the exact CNAME record to add at your DNS provider, and only saves the domain once that record actually resolves back to this API. This stops a typo'd or unowned domain from silently becoming your tracking host.
- **Gmail OAuth app** (`GOOGLE_OAUTH_CLIENT_ID`/`CLIENT_SECRET`/`REDIRECT_URI`) can still be set via `.env`, but the UI for it lives on the **Sender Accounts** page itself (the lock icon next to "Connect Gmail account"), not Settings > Integrations — that's the credential "Connect Gmail account" directly depends on, so it's configured right there. One shared Google Cloud OAuth app covers every Gmail mailbox you connect; that page shows the exact redirect URI to register in Google Cloud Console (prefilled from wherever this API is actually reachable) and walks through the rest of the setup.

## Database migrations in general

geniusCampaign uses Drizzle ORM migrations (`apps/api/src/db/migrations`) — never hand-edit the schema in production. After any update that adds migrations, run:

```bash
# Docker
docker compose exec api npm run db:migrate

# Manual
npm run db:migrate --workspace apps/api
```
