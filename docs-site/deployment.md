## Deploying geniusCampaign

geniusCampaign is a two-app monorepo (NestJS API + React SPA) backed by PostgreSQL and Redis. This page covers four hosting targets — **plain VPS**, **Coolify**, **AWS**, **DigitalOcean** — each with a Docker and a no-Docker path, plus the environment variables every path needs.

> Nothing works with placeholder credentials. Every send/verify/upload call hits the real provider (AWS SES, Cloudflare R2, Reoon, Gmail, etc.) — fill in real values for whatever features you plan to use, or leave them blank and configure later from the running app's **Settings > Integrations** / **Sender Accounts** pages (most integrations are DB-backed, not env-only — see the [environment variable table](#environment-variables) below).

### Common prerequisites (all targets)

- Node.js 22+ (only if not using Docker)
- PostgreSQL 14+ and Redis 6+ reachable from the API process
- A domain (or IP) the browser can reach the API and web app on
- `JWT_SECRET` — generate with `openssl rand -hex 32`
- `VITE_API_BASE_URL` — the public URL the **browser** uses to reach the API. This is baked into the frontend **at build time** (Vite) — changing it always requires a rebuild, never just a restart

---

## 1. Plain VPS (DigitalOcean Droplet, Linode, EC2 instance, bare metal — any Ubuntu/Debian box)

### 1a. Docker path

1. Install Docker + Docker Compose v2 on the VPS.
2. Clone the repo, `cp .env.example .env`, fill in `JWT_SECRET`, `POSTGRES_PASSWORD`, `VITE_API_BASE_URL`.
3. `docker compose build && docker compose up -d` — starts `postgres`, `redis`, `api` (port 3000), `web` (nginx, port 8080).
4. `docker compose exec api npm run db:migrate` — schema isn't created automatically on first boot.
5. Put nginx or Caddy in front as a reverse proxy for TLS (Let's Encrypt via certbot or Caddy's automatic HTTPS), forwarding your domain to ports 8080 (web) and a subdomain/path to 3000 (api).
6. Open the site, register the first account (becomes `owner` automatically — self-registration closes after this, see Getting Started in the user manual).

**Key things to configure:** firewall (only 80/443 open publicly, DB/Redis ports closed to the outside), a systemd unit or Docker's `restart: unless-stopped` (already set in `docker-compose.yml`) so containers survive a reboot, and a cron/systemd-timer for `pg_dump` backups — nothing in this stack backs up Postgres for you.

### 1b. No-Docker path

1. Install Node 22, PostgreSQL, Redis natively (`apt install postgresql redis-server` or equivalent).
2. `createdb geniuscampaign_dev` (or your prod DB name).
3. `npm ci && npm run build --workspace packages/shared && npm run build --workspace apps/api && npm run build --workspace apps/web`.
4. Configure `.env` at repo root (same variables as above), then `npm run db:migrate --workspace apps/api`.
5. Run the API with a process manager so it survives crashes/reboots: `pm2 start apps/api/dist/main --name geniuscampaign-api` (or a systemd unit calling `node apps/api/dist/main`).
6. Serve `apps/web/dist` as a static SPA via nginx with fallback routing:
   ```nginx
   server {
     listen 80;
     server_name yourdomain.com;
     root /path/to/geniusCampaign/apps/web/dist;
     location / { try_files $uri /index.html; }
   }
   ```
7. Reverse-proxy `api.yourdomain.com` (or `yourdomain.com/api`) to `localhost:3000` — whatever `VITE_API_BASE_URL` was set to at build time.

**Key things to configure:** `pm2 startup` (or systemd `enable`) so the API survives a reboot, log rotation for pm2/nginx logs, TLS via certbot.

---

## 2. Coolify

Coolify can build this repo two ways — pick one, don't mix them.

### 2a. Docker Compose path

If your Coolify instance is set to deploy via **Docker Compose**, point it at this repo's `docker-compose.yml` directly (Coolify supports "Docker Compose" as an application type). Set the same env vars (`JWT_SECRET`, `POSTGRES_PASSWORD`, `VITE_API_BASE_URL`) in Coolify's environment tab before first deploy, since `VITE_API_BASE_URL` is baked in at the `web` image's build step.

### 2b. Nixpacks path (two separate resources)

This is the path this repo's `DEPLOY.md` documents in full detail — use it if Coolify is set to build with Nixpacks rather than Compose. Deploy `apps/api` and `apps/web` as **two separate Nixpacks resources** against Postgres/Redis you provision in Coolify (or external instances), with **Base Directory set to the repo root** for both (required so `npm ci` can resolve the `packages/shared` workspace dependency).

Key gotchas specific to Coolify/Nixpacks (see `DEPLOY.md` for the exact commands):

- **API build can OOM** (`FATAL ERROR: Ineffective mark-compacts near heap limit`, exit 134) on memory-constrained build containers — `apps/api`'s build script already sets `NODE_OPTIONS=--max-old-space-size=4096`; if it still OOMs, raise the build container's memory limit in Coolify's Advanced tab, not just the Node flag.
- **Migration must be chained into the Start Command**, not left to Coolify's Post-deployment Command — on a fresh DB the app crash-loops on boot before Post-deployment can ever `exec` into it.
- **Web resource must use `npm install`, not `npm ci`** — the committed `package-lock.json` was generated on macOS and is missing a Linux-only optional dependency (`rolldown`'s native binding), so `npm ci` fails on Linux build containers.
- **`DATABASE_URL` should use `sslmode=no-verify`**, not `require`, against Coolify's self-signed internal Postgres cert.
- `VITE_API_BASE_URL` must be set as a **build-time** variable (Coolify separates build-time vs runtime env) — a rebuild (not just restart) is required whenever it changes.

---

## 3. AWS

Two viable shapes depending on how much infra you want to manage yourself.

### 3a. EC2 + Docker (simplest AWS path)

Same as [Plain VPS → Docker path](#1a-docker-path) above, just on an EC2 instance:

1. Launch an EC2 instance (Ubuntu 22.04+, t3.small or larger — Postgres + Redis + Node API + nginx on one box needs more than a t2.micro for anything beyond light testing).
2. Open a Security Group inbound rule for 80/443 only (not 5432/6379/3000/8080 — those stay internal).
3. Install Docker, clone the repo, follow the Docker steps above.
4. Point a Route 53 record (or your DNS provider) at the instance's Elastic IP, terminate TLS with Caddy/nginx + Let's Encrypt, or put an Application Load Balancer with an ACM certificate in front if you want managed TLS.

**Use AWS SES itself as your sending provider here regardless of where you host** — geniusCampaign's `SenderAccountService` already assumes SES as the primary provider (see the root `CLAUDE.md`, invariant 7). Running on AWS makes this natural: same-region SES calls avoid any cross-cloud latency, and you can attach an IAM instance role to the EC2 instance instead of long-lived `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` — the AWS SDK's default credential chain (which this app relies on, see `.env.example`'s comment) picks up instance-role credentials automatically, no keys in `.env` at all.

### 3b. RDS + ElastiCache + ECS/Fargate (managed, more moving parts)

For a more hands-off, auto-recovering setup:

1. **RDS PostgreSQL** (single instance is enough at this scale) for `DATABASE_URL`.
2. **ElastiCache Redis** for `REDIS_URL`.
3. **ECR** — build and push `apps/api/Dockerfile` and `apps/web/Dockerfile` images (`docker build -f apps/api/Dockerfile . && docker push ...`).
4. **ECS Fargate** — two services (api, web) or one task definition with two containers; set `VITE_API_BASE_URL` as a Docker build-arg before pushing the web image, since it's compile-time not runtime.
5. **Application Load Balancer** in front, ACM cert for TLS, target group health check against a real API route (e.g. `/auth/login` expecting a 400, not 200 — there's no dedicated `/health` route yet).
6. Run migrations as a one-off ECS task (`npm run db:migrate --workspace apps/api`) after each deploy that adds migrations — this doesn't happen automatically on container start in this stack.

**Key things to configure:** RDS security group only allowing the ECS task's security group (not `0.0.0.0/0`), Secrets Manager or SSM Parameter Store for `JWT_SECRET`/`TOKEN_ENCRYPTION_KEY` rather than plaintext task-definition env vars, and an IAM task role (not IAM user keys) for SES/S3-compatible access if you also use this role for anything beyond SES.

---

## 4. DigitalOcean

### 4a. Droplet + Docker (same as Plain VPS)

Follow [Plain VPS → Docker path](#1a-docker-path) exactly — a DigitalOcean Droplet is just a VPS. A 2GB/2vCPU Droplet is a reasonable minimum for Postgres + Redis + both apps together; go 4GB+ if `apps/api`'s TypeScript build runs on the same box (compiling can spike memory — see the OOM note under Coolify above, the same constraint applies here).

Use DigitalOcean **Managed Database** add-ons (Postgres, Redis) instead of running them in containers on the Droplet if you want automated backups/failover without managing them yourself — point `DATABASE_URL`/`REDIS_URL` at the managed instances' connection strings and drop the `postgres`/`redis` services from `docker-compose.yml` (keep just `api` and `web`).

### 4b. App Platform (PaaS, no server management)

DigitalOcean App Platform builds from a Dockerfile or buildpack per "component." Since this is an npm-workspaces monorepo, App Platform's auto-detected buildpack won't know which app to build — same problem as Coolify's Nixpacks path — so use the **Dockerfile** build strategy per component instead of the auto-detected one:

1. Create the app, add a component pointing at this repo, **source directory** left at repo root, **Dockerfile path** `apps/api/Dockerfile` for the API component.
2. Add a second component (Static Site or a second Dockerfile component using `apps/web/Dockerfile`) for the web app; if using Static Site type instead of a container, set the build command to `npm ci && npm run build --workspace packages/shared && npm run build --workspace apps/web` and output directory `apps/web/dist`.
3. Add a **Dev Database** or **Managed Database** cluster (Postgres) and a managed Redis (via DigitalOcean's Redis-compatible offering, or run Redis in its own App Platform component if no managed Redis is provisioned) — wire their connection strings into `DATABASE_URL`/`REDIS_URL` as component-level environment variables.
4. Set `VITE_API_BASE_URL` as a **build-time** environment variable on the web component (App Platform supports build-time vs runtime scoping per env var, same distinction as Coolify) — pointing at the API component's public URL.
5. Run migrations via App Platform's **Console** tab (one-off exec into the API component) or add a **Job** component that runs `npm run db:migrate --workspace apps/api` before each deploy.

**Key things to configure:** App Platform's default health check hits `/` — override it to a real API route for the api component (same `/auth/login` 400-expected caveat as ECS above), and pin the region for the database/Redis add-ons to match the app components' region to avoid cross-region latency on every request.

---

## Environment variables

Only "env-only" rows below are required in `.env` / your host's env-var UI at deploy time. Everything marked "DB, via UI" can be left blank and configured later from the running app (Settings > Integrations or Sender Accounts) — stored encrypted in the database, effective immediately, no restart needed.

| Area | Variables | Required for | Set via |
|---|---|---|---|
| Core | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `PORT` | Everything | **env-only**, required |
| Frontend | `VITE_API_BASE_URL` | Web app reaching the API (build-time) | **env-only**, required (build-time) |
| Gmail token encryption | `TOKEN_ENCRYPTION_KEY`, `ADMIN_APP_URL`, `GMAIL_DEFAULT_DAILY_LIMIT` | Encrypting stored Gmail refresh tokens; correct OAuth-redirect links | **env-only** if using Gmail sending |
| AWS SES | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_CONFIGURATION_SET`, `SES_FROM_EMAIL` | Primary/bulk sending | **Sender Accounts** page — `.env` values are only a fallback default |
| Cloudflare R2 | `CLOUDFLARE_R2_*` | Template editor image uploads | **Settings > Integrations** — DB, no env needed |
| Gmail OAuth client | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | Connecting Gmail mailboxes | **Sender Accounts** page — DB, no env needed |
| Verification | `REOON_API_KEY`, `NEVERBOUNCE_API_KEY` | Bulk email verification | **Settings > Integrations** — DB, no env needed |
| Tracking | `TRACKING_SIGNING_SECRET` | Signing open/click/unsubscribe tokens | **Settings > Integrations** — DB, no env needed |
| Tracking domain | `TRACKING_DOMAIN` | Open/click tracking host | **Settings > Integrations** only — DNS-verified, never settable via `.env` |
| Webhooks | `OUTBOUND_WEBHOOK_HMAC_SECRET` | Outbound webhook signing | **env-only** |
| Slack | `SLACK_WEBHOOK_URL` | Circuit-breaker / large-send notifications | **env-only** — no Settings UI for this |
| AI-assisted copy | `LLM_PROVIDER`, `LLM_MODEL`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY` | Template editor AI Assist | **Settings > Integrations** — DB, no env needed |

See `docs/SES_SNS_SETUP.md` (in the main repo, not published to this site) if you're wiring up SES bounce/complaint webhooks.

## Database migrations

geniusCampaign uses Drizzle ORM migrations (`apps/api/src/db/migrations`) — never hand-edit the schema in production. Run after every deploy that adds new migrations:

```bash
# Docker
docker compose exec api npm run db:migrate

# No Docker / any manual host
npm run db:migrate --workspace apps/api
```

None of the four targets above run this automatically on a plain restart (only the Coolify Nixpacks path chains it into the Start Command) — treat it as a required manual/scripted step in your deploy process everywhere else.
