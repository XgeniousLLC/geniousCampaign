# Deploying geniusCampaign

Three supported paths: **Docker** (`docker compose` — fastest for a self-managed VM), **Coolify** (if you're deploying to a Coolify instance), or **manual** (build the two apps yourself and run them with your own process manager / reverse proxy).

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

## Coolify (Nixpacks)

This repo also has Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`) for the plain-Docker path above, but if your Coolify instance is set to build with **Nixpacks**, skip those — deploy `apps/api` and `apps/web` as two separate Nixpacks resources instead, against Postgres/Redis you provide (Coolify's own managed database resources, or any external instance). Don't use `docker-compose.yml` here either; it's for the standalone Docker path only.

Both apps live in one npm-workspaces monorepo, so Nixpacks' auto-detected build (`npm ci` + whatever `build`/`start` it finds in `package.json`) doesn't know which app to build — you override the Install/Build/Start commands per resource, with **Base Directory set to the repo root**, not `apps/api/` or `apps/web/`. That's what lets `npm ci` resolve the `packages/shared` workspace dependency.

### 1. Provision Postgres and Redis

In Coolify: **+ New > Database > PostgreSQL** and **+ New > Database > Redis** (or point at existing external instances). Copy the connection strings Coolify shows you — these become `DATABASE_URL` and `REDIS_URL` below.

### 2. Create the API resource

**+ New > Application** > pick this repo/branch > **Build Pack: Nixpacks**.

In the resource's **Build** settings:

- Base Directory: `/` (repo root)
- Install Command: `npm ci`
- Build Command: `npm run build --workspace packages/shared && npm run build --workspace apps/api`
- Start Command: `npm run db:migrate --workspace apps/api && npm run start:prod --workspace apps/api`
- Port: `3000`

Migration is chained into the Start Command, not left to the Post-deployment Command alone — on a fresh database the app crashes on boot querying tables that don't exist yet (`SettingsService` reads `app_settings` in `onModuleInit`), which crash-loops the container before it's ever healthy enough for Coolify's Post-deployment step to `exec` into it. Running migrate first, in the same command, guarantees the schema exists before Nest touches the DB at all. `drizzle-kit migrate` is idempotent, so this is safe on every restart, not just the first.

Set these in the resource's **Environment Variables** tab (runtime, not build-time — the API reads them via `process.env` at startup/request time):

```
DATABASE_URL=<from step 1>?sslmode=no-verify
REDIS_URL=<from step 1>
JWT_SECRET=<openssl rand -hex 32>
PORT=3000
ADMIN_APP_URL=<the public URL of the web app, e.g. https://app.yourdomain.com>
```

If `DATABASE_URL` points at a Coolify-managed Postgres (self-signed/internal cert), use `sslmode=no-verify`, not `require` — newer `pg-connection-string` versions treat `require` as an alias for `verify-full` (full CA chain verification), which fails against a self-signed cert with `unable to verify the first certificate` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. `no-verify` still encrypts the connection, it just skips CA verification.

Add these two only if you plan to use Gmail sending — they're real secrets the app needs at startup and, unlike the Gmail OAuth client ID/secret themselves, are **not** settable from the running app's UI:

```
TOKEN_ENCRYPTION_KEY=<openssl rand -hex 32>
GMAIL_DEFAULT_DAILY_LIMIT=300
```

Add this only if you want Slack circuit-breaker/large-send notifications — there's currently no in-app UI for it (removed in GC-080), so it's `.env`-only:

```
SLACK_WEBHOOK_URL=
```

Everything else in `.env.example` (AWS SES, Cloudflare R2, Reoon/NeverBounce, Gmail OAuth client, OpenAI/DeepSeek) can be left unset here — configure those from the running app itself after first deploy (see the table below for exactly where each one lives). Deploy the resource.

### 3. Create the web resource

**+ New > Application** > same repo/branch > **Build Pack: Nixpacks**.

- Base Directory: `/` (repo root)
- Install Command: `npm install` (**not** `npm ci` — the committed `package-lock.json` was generated on macOS and is missing the Linux optional-dependency entry for `rolldown`'s native binding; `npm ci` installs exactly what's locked and fails on the Linux build container with `Cannot find module '.../rolldown-binding.linux-x64-gnu.node'`, a known npm optional-deps bug (npm/cli#4828). `npm install` re-resolves and pulls the correct platform binary. The API resource is unaffected — keep `npm ci` there.)
- Build Command: `npm run build --workspace packages/shared && npm run build --workspace apps/web`
- Start Command: `npx serve -s apps/web/dist -l 3000` (or any static-file server with SPA fallback — `apps/web/dist` is a static build, Nixpacks' default Node start won't serve it on its own)
- Port: `3000` (or whatever port your static server binds)

Set one **Build-Time Variable** (Coolify has a separate section for this vs. runtime env — must be build-time, since Vite inlines it into the JS bundle and it does nothing set at runtime):

```
VITE_API_BASE_URL=<the public URL of the API resource, e.g. https://api.yourdomain.com>
```

Deploy the resource. If you ever change this value, you must trigger a rebuild (not just a restart) for it to take effect.

### 4. Migrations

Already handled — chained into step 2's Start Command, ahead of `start:prod`, specifically so it runs before the app can crash-loop on missing tables. Don't rely on Coolify's **Post-deployment Command** for this on a fresh database: it `exec`s into the already-running new container, which never happens if that container is crash-looping because the schema doesn't exist yet — a deadlock. The Post-deployment Command field can still be set to the same `npm run db:migrate --workspace apps/api` as a no-op safety net once the app's healthy, but the Start Command chain is what actually has to carry this.

### 5. Verify and finish setup

- Open the web resource's URL, register the first account (becomes `owner` automatically).
- Go to **Settings > Integrations** and **Sender Accounts** in the app itself to add the credentials you skipped in step 2 — see the "Set via" column below for where each one lives.

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

Every variable is documented with inline comments in `.env.example`. The key thing to know before filling these in: **most of them are not actually required at deploy time.** Only "env-only" rows below must be set in `.env`/Coolify — everything marked "DB, via UI" can be left blank and configured from the running app itself after first deploy (Settings > Integrations or Sender Accounts, per row), stored encrypted in the database, and takes effect immediately with no restart.

| Area | Variables | Required for | Set via |
|---|---|---|---|
| Core | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `PORT` | Everything | **env-only**, required |
| Frontend | `VITE_API_BASE_URL` | Web app to reach the API (build-time) | **env-only**, required (build-time) |
| Gmail token encryption | `TOKEN_ENCRYPTION_KEY`, `ADMIN_APP_URL`, `GMAIL_DEFAULT_DAILY_LIMIT` | Encrypting stored Gmail refresh tokens at rest; correct password-reset/OAuth-redirect links | **env-only** if using Gmail sending — not settable from the UI even though the OAuth client credentials below are |
| AWS SES | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_CONFIGURATION_SET`, `SES_FROM_EMAIL` | Primary/bulk email sending | **Sender Accounts** page — add an SES account with its own credentials there; `.env` values are only used as a fallback default for accounts left blank |
| SES bounce/complaint webhook | none (URL only, no env var) | Auto-suppressing hard bounces/complaints | **Settings > Integrations** shows the webhook URL to paste into an AWS SNS subscription — no field to save here, just a manual AWS-console wiring step. See [`docs/SES_SNS_SETUP.md`](docs/SES_SNS_SETUP.md). |
| Cloudflare R2 | `CLOUDFLARE_R2_*` | Template editor image uploads | **Settings > Integrations** — DB, no env needed |
| Gmail OAuth client | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | Connecting Gmail mailboxes as sender accounts | **Sender Accounts** page (lock icon next to "Connect Gmail account") — DB, no env needed |
| Verification | `REOON_API_KEY`, `NEVERBOUNCE_API_KEY` | Bulk email verification | **Settings > Integrations** — DB, no env needed |
| Tracking | `TRACKING_SIGNING_SECRET` | Signing open/click/unsubscribe tokens | **Settings > Integrations** — DB, no env needed |
| Tracking domain | `TRACKING_DOMAIN` | Open/click tracking host | **Settings > Integrations** only — DNS-verified, never settable via `.env` at all |
| Webhooks | `OUTBOUND_WEBHOOK_HMAC_SECRET` | Outbound webhook signing | **env-only** — feature not implemented yet (GC-037/043), harmless to leave blank today |
| Slack | `SLACK_WEBHOOK_URL` | Circuit-breaker / large-send notifications | **env-only** — no Settings UI exists for this (removed in GC-080); set it in `.env`/Coolify or skip the feature |
| AI-assisted copy | `LLM_PROVIDER`, `LLM_MODEL`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY` | Template editor AI Assist | **Settings > Integrations** — DB, no env needed |

Notes on the two DB-only rows:

- **Open/click tracking domain** (`TRACKING_DOMAIN`): type the domain in Settings > Integrations > "Open/click tracking," click "Check DNS" — the app shows the exact CNAME record to add at your DNS provider, and only saves the domain once that record actually resolves back to this API. This stops a typo'd or unowned domain from silently becoming your tracking host.
- **AWS SES / Gmail OAuth client**: both moved off the generic Settings > Integrations panel and onto the **Sender Accounts** page directly (GC-077/GC-080) — that's the page each credential actually gates, so it's configured right there instead of a separate settings screen.

## Database migrations in general

geniusCampaign uses Drizzle ORM migrations (`apps/api/src/db/migrations`) — never hand-edit the schema in production. After any update that adds migrations, run:

```bash
# Docker
docker compose exec api npm run db:migrate

# Manual
npm run db:migrate --workspace apps/api
```
