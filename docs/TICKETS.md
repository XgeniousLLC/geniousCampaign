# Ticket backlog

Status values: `Not Started` / `In Progress` / `Done` / `Blocked`. Update the table row and the ticket's own status line together.

## Master list

| ID | Title | Sprint | Size | Status | Depends on |
|---|---|---|---|---|---|
| GC-001 | Monorepo scaffolding (npm workspaces) | 0 | S | Done | — |
| GC-002 | Create local PostgreSQL database | 0 | S | Done | — |
| GC-003 | Verify local Redis connectivity | 0 | S | Done | — |
| GC-004 | Drizzle baseline schema + first migration | 0 | S | Done | GC-001, GC-002 |
| GC-005 | NestJS app bootstrap | 0 | S | Done | GC-001, GC-004 |
| GC-006 | React app bootstrap (Vite + TS + Tailwind + Zustand) | 0 | S | Done | GC-001 |
| GC-007 | Root dev scripts (no Docker) | 0 | S | Done | GC-005, GC-006 |
| GC-008 | Consolidated .env.example | 0 | S | Done | GC-005 |
| GC-010 | Contacts schema + CRUD API | 1 | M | Done | GC-004 |
| GC-011 | Lists + tags schema + CRUD API | 1 | M | Done | GC-010 |
| GC-012 | CSV contact import (queued) | 1 | M | Done | GC-010, GC-011 |
| GC-013 | Templates schema + CRUD API | 1 | M | Done | GC-004 |
| GC-014 | TipTap editor base integration | 1 | M | Done | GC-013, GC-006 |
| GC-015 | R2 image upload in editor | 1 | M | Code done, needs Sharifur's R2 credentials for a live end-to-end pass | GC-014 |
| GC-016 | Spintax spinBlock extension + resolver | 1 | M | Done | GC-014 |
| GC-017 | AWS SES sending service | 1 | M | Done (code ready; live send needs Sharifur's AWS creds) | GC-013 |
| GC-018 | SES bounce/complaint pipeline + suppression list | 1 | M | Done (code ready; live SNS wiring needs Sharifur's AWS setup) | GC-017 |
| GC-019 | Open + click tracking | 1 | M | Done | GC-017 |
| GC-020 | One-off campaign send flow | 1 | L | Done | GC-011, GC-016, GC-017, GC-018, GC-019 |
| GC-021 | Admin UI: contacts, templates | 1 | L | Done | GC-011, GC-016 |
| GC-021b | Admin UI: send campaign flow | 1 | M | Done | GC-020, GC-021 |
| GC-030 | Sequences + steps schema + CRUD API | 2 | M | Done | GC-013 |
| GC-031 | EnrollmentService (enroll/pause/resume/stop) | 2 | M | Done | GC-030, GC-010 |
| GC-032 | Sequence runner (BullMQ processor) | 2 | L | Done | GC-031, GC-020 |
| GC-033 | Admin UI: sequence builder | 2 | M | Done | GC-030, GC-021 |
| GC-034 | Admin UI: contact enrollment panel | 2 | S | Done | GC-031, GC-021 |
| GC-035 | Condition-based trigger engine | 2 | L | Done | GC-031 |
| GC-036 | Schedule-based trigger (BullMQ repeatable) | 2 | M | Split: recurring trigger Done, one-off campaign scheduling folded into GC-020/021b | GC-032 |
| GC-037 | Internal event bus wiring | 2 | M | Done | GC-035 |
| GC-040 | Inbound webhook framework (HMAC) | 3 | M | Done | GC-010 |
| GC-041 | Sequence webhook controller | 3 | S | Done | GC-040, GC-031 |
| GC-042 | Admin enrollment controller | 3 | S | Done | GC-031, GC-034 |
| GC-043 | Outbound webhook dispatcher | 3 | M | Done | GC-037 |
| GC-044 | Gmail OAuth connect flow | 3 | M | Code done, needs Sharifur's Google Cloud OAuth client for a live connect | GC-005 |
| GC-045 | SendDispatcherService (SES + Gmail rotation) | 3 | M | Done | GC-044, GC-017 |
| GC-046 | Gmail bounce scanner (DSN polling) | 3 | M | Code done, needs GC-044's live connect to fully exercise | GC-044, GC-018 |
| GC-047 | Admin UI: sender accounts | 3 | S | Done | GC-044, GC-021 |
| GC-048 | Local verification pre-filter | 3 | S | Done | GC-010 |
| GC-049 | Reoon + NeverBounce verification integration | 3 | M | Done | GC-048 |
| GC-050 | Bounce-rate circuit breaker | 4 | M | Done | GC-018, GC-032 |
| GC-051 | Slack notifications | 4 | S | Done | GC-050 |
| GC-052 | Dry-run / send-to-self mode | 4 | S | Done | GC-020, GC-032 |
| GC-053 | Pre-send confirmation summary | 4 | S | Done | GC-020 |
| GC-054 | Spintax resolved-preview UI | 4 | S | Done | GC-016 |
| GC-055 | Image compression + EXIF stripping | 4 | S | Done | GC-015 |
| GC-056 | Lightweight RBAC | 4 | M | Done | GC-005 |
| GC-057 | Audit log | 4 | M | Done | GC-056 |
| GC-058 | Analytics dashboard | 4 | L | Done | GC-019, GC-032 |
| GC-059 | AI-assisted template copy | 4 | M | Code done, needs Sharifur's real OpenAI/DeepSeek API key | GC-014 |
| GC-060 | Email log UI (all sends, filterable, detail drawer) | 4 | M | Done | GC-019, GC-020 |
| GC-061 | Wrap guarded-write + audit-log calls in a DB transaction | 4 | S | TODO | GC-057 |
| GC-062 | Verification dashboard UI (bulk verify, stats, credits) | 4 | M | TODO | GC-049 |
| GC-063 | Add JwtAuthGuard+RolesGuard to TagsController | 4 | S | TODO | GC-056 |
| GC-064 | Forgot/reset password flow | 4 | M | Code done, needs Sharifur's AWS SES creds for the actual reset email | GC-011 (auth) |
| GC-065 | App shell: sidebar + top bar rebuild to match design | 4 | M | Done | GC-006 |
| GC-066 | Contacts list: rebuild to match design (bulk actions, tags/lists/last-activity columns, sort, pagination) | 4 | L | Done | GC-021, GC-011, GC-035, GC-049 |

---

## Design reference map

`docs/design/geniusCampaign.dc.html` has the exact layout/copy/interaction spec for these screens — check the matching section (grep the comment marker) before marking the corresponding ticket done:

| Ticket | Design section |
|---|---|
| GC-021 (contacts UI) | `CONTACTS`, `CONTACT DETAIL`, `CSV IMPORT MODAL` |
| GC-021 (templates UI) / GC-014 / GC-015 / GC-016 | `TEMPLATES`, `TEMPLATE EDITOR`, `SPINTAX EDIT MODAL` |
| GC-021b (send flow) / GC-020 | `CAMPAIGNS LIST`, `CAMPAIGN COMPOSE`, `CAMPAIGN DETAIL` |
| GC-011 (lists/tags UI) | `LISTS & TAGS` |
| GC-033 (sequence builder) | `SEQUENCES LIST`, `SEQUENCE BUILDER / DETAIL`, `ENROLL MODAL` |
| GC-034 (contact enrollment panel) | within `CONTACT DETAIL` |
| GC-035 (triggers UI) | `TRIGGERS`, `NEW TRIGGER MODAL` |
| GC-047 (sender accounts UI) | `SENDER ACCOUNTS` |
| — (webhook delivery log UI, not yet a separate ticket — fold into GC-040/043) | `WEBHOOKS` |
| GC-049 (verification UI) | `VERIFICATION` |
| GC-056 / GC-057 (settings, RBAC, audit log) | `SETTINGS` |
| GC-058 (analytics dashboard) | `DASHBOARD` |
| GC-060 | `EMAIL LOG`, `EMAIL LOG DETAIL DRAWER` |
| GC-059 | `AI ASSIST MODAL` |

The design also fixes the overall shell (sidebar nav grouping, top bar with search/health-pill/notifications) — implement that once, early in Sprint 1's UI work, rather than per-screen.

---

## Sprint 0 — Project setup

### GC-001 — Monorepo scaffolding (npm workspaces)
Set up the root `package.json` with a `"workspaces"` field listing `apps/api`, `apps/web`, `packages/shared`. Shared devDependencies (TypeScript, ESLint, Prettier) hoisted to the root.
**Acceptance criteria:**
- `npm install` at root installs all three packages' dependencies via a single root `package-lock.json` (no per-package lockfiles).
- `packages/shared` exports at least one placeholder type, importable from both `apps/api` and `apps/web`.
- Root README (not CLAUDE.md) has a one-paragraph "how to get this running" pointing at Sprint 0's other tickets.

### GC-002 — Create local PostgreSQL database
Postgres is already installed and running — this ticket is just creating the dev database and confirming connectivity, nothing else.
**Acceptance criteria:**
- `createdb geniuscampaign_dev` succeeds (or a one-line `scripts/setup-db.sh` wrapping it, safe to re-run — check-if-exists rather than erroring on a second run).
- `psql geniuscampaign_dev -c '\dt'` connects successfully (empty table list is fine at this point).
- `DATABASE_URL` in `.env.example` matches the created database's connection string.

### GC-003 — Verify local Redis connectivity
Redis is already installed and running — this ticket just confirms it's reachable and documents the connection string, nothing to install.
**Acceptance criteria:**
- `redis-cli ping` returns `PONG`.
- `REDIS_URL` in `.env.example` matches the local instance's connection string.

### GC-004 — Drizzle baseline schema + first migration
Initialize Drizzle ORM (`drizzle-orm` + `drizzle-kit`) in `apps/api`, pointed at `DATABASE_URL`. Baseline schema: just enough to prove migrations work — `contacts` table with `id`, `email`, `createdAt` is sufficient for this ticket; full schema comes in later tickets.
**Acceptance criteria:**
- `drizzle-kit generate` + `drizzle-kit migrate` (or `push` for dev) run cleanly against the local DB from GC-002.
- `drizzle-kit studio` can open and show the empty `contacts` table.

*(Changed from Prisma to Drizzle 2026-07-11 — see CLAUDE.md Conventions.)*

### GC-005 — NestJS app bootstrap
Standard NestJS app in `apps/api` with `ConfigModule` (validated env schema — fail fast on missing required vars), a `GET /health` endpoint, and Drizzle wired in as an injectable `DrizzleService`.
**Acceptance criteria:**
- `nest start --watch` boots without errors given a valid `.env`.
- `GET /health` returns `200 { status: "ok" }`.
- Missing a required env var causes a clear startup error, not a runtime crash later.

### GC-006 — React app bootstrap (Vite + TS + Tailwind + Zustand)
Vite + React + TypeScript in `apps/web`. Tailwind CSS configured (`tailwind.config.ts`, base styles imported). Zustand added with one real store (e.g. a `useUiStore` for sidebar/nav state) wired into a component, so the pattern is established before later tickets add domain-specific stores. Basic routing shell (react-router or equivalent), a placeholder layout (nav + content area) styled with Tailwind, and an API client wrapper (fetch-based, reads `VITE_API_BASE_URL`).
**Acceptance criteria:**
- `vite dev` boots and renders a placeholder page with visible Tailwind styling (not just default browser CSS).
- A Zustand store's state change is reflected in the UI (e.g. toggling the nav via the placeholder store), proving the pattern works end-to-end.
- API client successfully calls `apps/api`'s `/health` endpoint and displays the result, proving the two apps can talk to each other locally.

### GC-007 — Root dev scripts (no Docker)
Root `package.json` script (`npm run dev`) that runs both apps concurrently (`concurrently`, or `npm run dev --workspaces --if-present` where that fits), plus `npm run dev:api` / `npm run dev:web` for running one at a time.
**Acceptance criteria:**
- `npm run dev` from repo root starts both apps with clearly prefixed log output.
- No Docker/docker-compose file anywhere in the repo.

### GC-008 — Consolidated .env.example
Root-level `.env.example` matching the full list in `CLAUDE.md`, even for vars not needed until later sprints (commented as "not needed until Sprint N").
**Acceptance criteria:**
- Every env var referenced anywhere in `CLAUDE.md` appears in `.env.example`.
- Copying it to `.env` and filling in just the Sprint 0/1 values is enough to run everything up through Sprint 1.

---

## Sprint 1 — Foundation

### GC-010 — Contacts schema + CRUD API
Full `Contact` model: `email` (unique), `firstName`, `lastName`, `customFields` (JSONB), `status`, timestamps. Standard REST CRUD (`GET/POST /contacts`, `GET/PATCH/DELETE /contacts/:id`).
**Acceptance criteria:**
- Duplicate email on create returns a clear 409, not a raw DB constraint error.
- `customFields` accepts arbitrary JSON and round-trips correctly.

### GC-011 — Lists + tags schema + CRUD API
`List` (static vs dynamic/saved-filter type), `Tag`, and their many-to-many join tables to `Contact`. CRUD for lists and tags; add/remove contact-to-list and contact-to-tag endpoints.
**Acceptance criteria:**
- A contact can belong to multiple lists and have multiple tags.
- Dynamic list type stores a filter definition (JSONB) but membership computation can be a stub for now (real evaluation lands with GC-035's condition engine).

**UI added 2026-07-12** (see the full cross-check pass note near the end of this file): `ListsAndTags.tsx` at `/lists` — real lists/tags tables with real member counts, create-list/create-tag forms. Dynamic list membership is still the stub this ticket always allowed — not evaluated anywhere, `memberCount` for a dynamic list will always read 0 until that lands.

### GC-012 — CSV contact import (queued)
Upload endpoint accepts a CSV, enqueues a BullMQ job rather than processing inline. Job dedupes on email (update-if-exists vs create), collects per-row errors, and exposes an import status endpoint.
**Acceptance criteria:**
- A 10,000-row CSV doesn't block the request — returns immediately with a job ID.
- Malformed rows are reported individually, not by failing the whole import.
- Re-importing the same file updates existing contacts rather than erroring on duplicate emails.

### GC-013 — Templates schema + CRUD API
`Template` (name, subject, bodyJson, bodyHtml, bodyText, folder) and `TemplateVersion` (snapshot on save). CRUD API; saving a template creates a new version row.
**Acceptance criteria:**
- `bodyHtml`/`bodyText` are derived server-side (or client-side before save, but stored) from `bodyJson`, not hand-maintained separately.
- Version history for a template is retrievable and shows at least the last N saves.

### GC-014 — TipTap editor base integration
TipTap wired into the React admin for template subject + body editing, with StarterKit and basic toolbar (bold/italic/link). No spintax or image upload yet — this ticket is the plain editor working end-to-end (load template, edit, save).
**Acceptance criteria:**
- Editing and saving a template round-trips `bodyJson` correctly through GC-013's API.
- Personalization token insertion (`{{contact.firstName}}`) works as a distinct, visually-marked node, not raw text the user could accidentally mangle.

*(Implementation note: subject is a plain text field, not a second TipTap instance — matches the design file's TEMPLATE EDITOR section, which renders `activeTemplate.subject` as flat text with no token pills, unlike the body. Personalization tokens in the subject are typed as literal `{{contact.firstName}}` text.)*

### GC-015 — R2 image upload in editor
Import the R2 reference implementation (see `CLAUDE.md`): presign endpoint, `R2Image` TipTap extension, upload placeholder, toolbar button.
**Acceptance criteria:**
- Pasting/dropping/inserting an image results in an R2 URL in the saved template, never a base64 data URI.
- R2 bucket CORS is configured per the reference implementation's README; direct browser-to-R2 upload works.

**Blocked 2026-07-11**: `.env`'s `CLOUDFLARE_R2_*` vars are all empty — no R2 account/bucket/keys provided yet. Also still need the reference implementation itself pasted in per `CLAUDE.md`'s "Reference implementations already drafted" section. Move to GC-016 in the meantime.

**Unblocked 2026-07-12**: reference implementation never arrived, built fresh from the ticket + invariant 6 directly. `R2Service` (`apps/api/src/uploads/`) wraps `@aws-sdk/client-s3`'s `PutObjectCommand` + `@aws-sdk/s3-request-presigner`'s `getSignedUrl`, pointed at R2's S3-compatible endpoint (`https://<account_id>.r2.cloudflarestorage.com`, `region: 'auto'`) — throws a clear "R2 is not configured" error (same pattern as `SesSenderProvider`) rather than faking a presigned URL when any of the five `CLOUDFLARE_R2_*` vars are missing. `POST /uploads/presign` (`JwtAuthGuard`+`RolesGuard`, owner/editor) validates `filename` (alphanumeric + `._-` only, blocks path traversal) and `contentType` (allowlist: png/jpeg/webp/gif) before ever touching R2. Frontend: `R2Image` (thin `@tiptap/extension-image` config — the node's `src` attribute is just a string, the invariant is enforced by the upload flow only ever calling `setImage()` with a presigned-upload's real `publicUrl`, never a local blob/data URL), `useImageUpload` hook wired to a new toolbar button in `TemplateEditorToolbar`.

**Deviation from the ticket's literal ask**: no separate "upload placeholder" node/decoration in the document while uploading — the toolbar button shows a `…` state and a done/error message inline next to it instead. Simpler, still gives real upload-in-progress feedback, but not full parity with a placeholder-node-in-the-doc UX; revisit if that specific interaction matters once real R2 traffic is flowing.

Verified live end-to-end via a headless Playwright pass (the Chrome browser-automation extension was disconnected for this session — per `CLAUDE.md`'s fallback path for that case, used Playwright headless instead of skipping the live UI pass): logged in, opened the template editor, clicked "Insert image", picked a real 2000×1500 JPEG, watched the client-side compress-and-strip-EXIF step run without error, then confirmed the presign request correctly failed with the exact "Cloudflare R2 is not configured" message, surfaced inline in the toolbar (not a silent failure, not a fake success). Also confirmed at the API level directly: `POST /uploads/presign` with valid auth returns the same clean 500 (never a fake presigned URL), and rejects `../evil.jpg` / `text/html` with a 400 before ever calling R2. 2 Jest tests on `R2Service` (throws when unconfigured; presigns correctly and derives the public URL from the real bucket config when it is). **Sharifur: once real R2 credentials are in `.env`, this whole path should work as-is — worth a real end-to-end pass (upload a real photo, confirm it lands in the bucket EXIF-stripped, confirm the template's saved `bodyJson` has a real R2 URL not a data URI) since I couldn't exercise the actual R2 PUT without credentials.**

### GC-016 — Spintax spinBlock extension + resolver
Custom TipTap node for `{option A|option B}` in both subject and body, plus a `resolveSpintax(text): string` function used at send time (not save time).
**Acceptance criteria:**
- Spintax blocks render as a distinct visual element in the editor, editable via a small UI (add/remove/edit options), not as raw curly-brace text.
- `resolveSpintax` correctly handles nested groups and picks uniformly at random.
- Resolving the same spintax template 20 times in a test produces a reasonable spread across options, not always the same one.

### GC-017 — AWS SES sending service
`SesSenderProvider`-equivalent (can start as a single hardcoded sender identity; multi-account rotation comes in GC-045). Uses `SendRawEmail` so custom headers (List-Unsubscribe, message tags) are controllable.
**Acceptance criteria:**
- A test send successfully delivers to a real inbox via SES sandbox or a verified identity.
- Headers required for one-click unsubscribe are present on every send.

**Unblocked 2026-07-12**: Sharifur asked to complete all remaining blocks and test the credential-dependent parts manually himself. `EmailSenderProvider` interface (invariant 7) + `SesSenderProvider` using nodemailer's SES transport (SESv2 `SendEmailCommand` — nodemailer 9.x moved off `client-ses`/`SendRawEmailCommand` to `client-sesv2`, still builds and sends a real raw MIME message under the hood so all headers survive) with `List-Unsubscribe`/`List-Unsubscribe-Post` (RFC 8058) and SES message tags on every send. Real AWS SDK code — no AWS_REGION means it throws a clear "not configured" error rather than faking a send.

Still genuinely blocked on: an actual live send to a real inbox — no AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/SES_CONFIGURATION_SET/SES_FROM_EMAIL in `.env`. **Sharifur: fill those in and send a real test to verify end-to-end delivery** — the code path is ready.

Verified everything that doesn't need live AWS: 2 Jest tests mocking `nodemailer.createTransport` confirm (a) send() throws instead of faking success when AWS_REGION is unset, and (b) a configured send includes the exact List-Unsubscribe/List-Unsubscribe-Post headers and ConfigurationSetName/EmailTags on every call.

### GC-018 — SES bounce/complaint pipeline + suppression list
SES configuration set → SNS topic → SQS queue → NestJS consumer. `SuppressionList` table. Every send checks suppression first and skips (logging why) rather than sending.
**Acceptance criteria:**
- A deliberately-bounced test address (SES has mailbox simulator addresses for this) ends up in the suppression list automatically.
- Attempting to send to a suppressed address is blocked before it reaches SES, not after.

**Unblocked 2026-07-12**: `suppression_list` + `soft_bounce_counts` tables, `SuppressionService` (hard bounce/complaint suppress immediately, soft bounces suppress after 3 repeats — invariant 8). Deviated from the ticket's literal "SNS → SQS → consumer" pattern: built `POST /webhooks/ses/sns` as an SNS HTTPS subscription endpoint instead of an SQS consumer, since no SQS queue can be provisioned without real AWS access — same end result (bounce/complaint JSON → suppression), just HTTP delivery instead of polling a queue. Handles the SNS `SubscriptionConfirmation` handshake for real (fetches `SubscribeURL`). Also added `GET/POST /unsubscribe/:token` (HMAC-signed via `TRACKING_SIGNING_SECRET`, RFC 8058 one-click) since `SesSenderProvider`'s `List-Unsubscribe` header needed a real working URL to point at.

**Sharifur: still needs a real SES configuration set wired to a real SNS topic subscribed to this endpoint's public URL** for actual bounce/complaint traffic to arrive — the endpoint itself is ready and tested.

Verified live: simulated real-shaped SNS notification payloads via curl — a hard bounce suppressed immediately, a complaint suppressed immediately, and 3 consecutive soft bounces for the same address suppressed only on the 3rd (not the 1st or 2nd). Unsubscribe token flow verified both ways: a validly-signed token unsubscribes and suppresses; a tampered token is rejected with 400.

### GC-019 — Open + click tracking
Tracking subdomain, 1×1 pixel endpoint, link-rewriting + redirect endpoint, `EmailEvent` table.
**Acceptance criteria:**
- Opening a sent test email in a real client records an open event.
- Clicking a link in a sent test email records a click event and correctly redirects to the original URL.
- Tracking pixel/links use signed tokens, not raw sequential send IDs.

**Unblocked 2026-07-12**: `email_events` table, `TrackingService` (`GET /t/o/:token` returns a real 1x1 GIF and records an open; `GET /t/c/:token` records a click then 302-redirects to the original URL), `rewriteLinksForTracking()` util that rewrites every `<a href>` in resolved HTML to a signed click URL. Tokens are HMAC-signed `{sendId}` / `{sendId, url}` payloads (`TRACKING_SIGNING_SECRET`) — never a raw send ID in the URL. `TRACKING_DOMAIN` still needs a real public domain from Sharifur for production; falls back to `localhost:$PORT` for local dev/testing.

Verified live against a real `sends` row: hit the open-pixel URL directly (200, `image/gif`, real event row written), hit the click URL directly (302 to the exact original URL, event row with that URL written), and confirmed a tampered token 400s. `rewriteLinksForTracking` has 2 Jest tests (rewrites real `<a href>` tags, leaves `mailto:`/`#anchor` links untouched). Couldn't test in an actual mail client end-to-end (needs GC-017's live AWS send) — Sharifur can do that manual pass once SES credentials are in.

### GC-020 — One-off campaign send flow
Ties GC-011/016/017/018/019 together: pick a template + a list, resolve spintax per recipient, check suppression, send via SES, record the resolved subject/body on the `Send` row per the spintax-resolution invariant in `CLAUDE.md`.
**Acceptance criteria:**
- Sending a campaign to a 5-contact test list produces 5 distinct (or at least independently-resolved) spintax variants if the template uses spintax.
- Every `Send` row has its fully-resolved subject/body stored, independent of what the template looks like now.

**Blocked 2026-07-11**: depends on GC-017/018/019, all blocked on AWS SES access.

**Unblocked 2026-07-12**: `CampaignsService.send()` enqueues one BullMQ job (`jobId: campaignId`, so a duplicate click is a no-op, not a second send — invariant 10) rather than sending in the request/response cycle. `CampaignSendProcessor` iterates the target list's real membership, checks suppression per recipient, resolves personalization before spintax per invariant 5, builds tracking pixel/click-rewrite/unsubscribe URLs the same way the sequence runner does, and reuses the same `SesSenderProvider`/`EmailSenderProvider` interface (invariant 7) rather than a parallel send path. `campaigns.isDryRun` — a field that already existed on the schema — now does something: a dry-run campaign records a `sends` row per recipient (status `sent`, `isDryRun: true`, `providerMessageId: null`) but never calls the real sender, so a dry-run can never leak a real send. Full send-to-self routing/large-send guardrails are GC-052/053's scope, not this ticket's — noted rather than half-built here.

Found and fixed a real bug via the processor's own integration test: the campaign's final status computation divided failures against total recipients (including suppressed ones) instead of against attempted sends, so a campaign where every real attempt failed but some recipients were suppressed incorrectly reported `status: 'sent'`. Fixed to `attempted > 0 && sentCount === 0 → 'failed'`.

Verified live: sent a real 5-contact campaign using a template with spintax in both subject and body — each of the 5 `sends` rows has an independently-resolved subject (`Hi`/`Hello`/`Hey` variants) and body (`Welcome`/`Greetings` variants), matching this ticket's acceptance criterion exactly. Confirmed a real (non-dry-run) send against unconfigured SES fails cleanly with the same actionable error message GC-017/018 established, recorded per-recipient, campaign status correctly `failed`. Confirmed re-sending an already-sent campaign is rejected (400), never a second send. 3 Jest integration tests (suppressed + real-failed send / dry-run / duplicate-job no-op), full suite 40/40, `tsc --noEmit` clean.

### GC-021 — Admin UI: contacts, templates
React screens: contacts list/detail/import, template list/editor (GC-014/016 wired in; GC-015 image upload still pending R2 credentials).
**Acceptance criteria:**
- An admin can import contacts via CSV and browse/edit them, and create/edit a template with spintax + personalization tokens, entirely through the UI, no direct API calls needed.

*(Split 2026-07-11 from the original combined "contacts, templates, send campaign" ticket — the send-campaign flow depends on GC-020, which is blocked on AWS SES access. See GC-021b.)*

### GC-021b — Admin UI: send campaign flow
"Send campaign" flow (pick template, pick list, confirm, send), wired to GC-020's one-off send endpoint.
**Acceptance criteria:**
- An admin can go from "no contacts" to "sent campaign" entirely through the UI, no direct API calls needed.

**Blocked 2026-07-11**: depends on GC-020, blocked on AWS SES access.

**Unblocked 2026-07-12**: `CampaignsList`/`CampaignCompose`/`CampaignDetail` screens, new `campaignsApi.ts` client, `createList`/`listContactsForList` added to `contactsApi.ts` (no dedicated list-management screen existed yet, so Compose gets an inline "create a new list" affordance rather than blocking on a separate ticket). Compose scopes audience selection to "pick an existing list" only — the design's list/tags/individual-recipient audience-mode toggle is left as a single mode for now since GC-020's backend only supports `listId` targeting; noted rather than building UI for backend that doesn't exist. Campaign Detail shows real counts and a live per-recipient sends table (polls every 2s while `status` is `draft`/`sending`) rather than the design's engagement funnel/open/click stats, since those depend on GC-058/060 (analytics, email log) which haven't landed yet.

Verified live in Chrome: navigated Campaigns → New campaign, template auto-selected with real resolved subject preview shown inline, list defaulted with a live recipient count pulled from the real API, submitted a dry-run send — landed on Campaign Detail immediately showing `sent`/`dry run` badges and all 5 real recipient rows with per-send status and timestamp, no manual refresh. Caught two real bugs in the process (both fixed, not screenshotted-past): (1) a stale JWT in the browser session (pointing at a `users` row from an earlier DB reset) produced a 500 on campaign create — not a code bug, but surfaced a systemic gap: **every RBAC-guarded write endpoint's audit-log call happens outside a transaction with its main write**, so a failed audit-log insert (e.g. a dangling `actor_id`) leaves the primary row committed while the client sees a 500 and thinks nothing happened — this affects templates/sequences/lists/enrollments/campaigns/triggers identically, not just this ticket; flagged here as a cross-cutting follow-up rather than silently patched in just campaigns. (2) the orphaned draft campaign row that bug produced was cleaned up manually — not a data-loss risk since campaigns are draft-only until a job is enqueued.

---

## Sprint 2 — Automation core

### GC-030 — Sequences + steps schema + CRUD API
`Sequence`, `SequenceStep` (order, type: send_email/wait/condition/exit, templateId, delayValue, delayUnit). CRUD API.
**Acceptance criteria:**
- Steps are strictly ordered and reorderable via API.
- A sequence with zero steps is a valid (if useless) state — don't special-case it into an error.

### GC-031 — EnrollmentService (enroll/pause/resume/stop)
Import the reference implementation from `CLAUDE.md`. `SequenceEnrollment` schema, the service itself.
**Acceptance criteria:**
- Matches the architectural invariants in `CLAUDE.md` items 1–3 exactly — this ticket exists specifically to not re-derive that design.
- Duplicate enroll attempt (already active/paused) returns a clear conflict, not a silent no-op.

**Unblocked 2026-07-12**: reference implementation was never provided; Sharifur asked to complete the block, so this was built fresh from the architectural invariants (CLAUDE.md items 1–3) rather than a re-delivered reference. `sequence_enrollments` (one row per sequence+contact, own currentStepId/nextRunAt — no shared sequence clock). `EnrollmentService` has enroll/pause/resume/stop plus lookups; a re-enroll after stop/completed creates a fresh row starting at step 1 (invariant 1). Duplicate enroll while active/paused throws 409. No controller yet — that's GC-041/042's job, both of which must call this exact service (invariant 2).

Verified via 6 Jest integration tests against the real local DB: enroll starts at first step, duplicate-while-active is rejected, pause→pause is rejected but pause→resume works, stop clears currentStepId/nextRunAt, re-enroll after stop creates a second fresh row, and a zero-step sequence auto-completes on enroll.

### GC-032 — Sequence runner (BullMQ processor)
Import the reference implementation. Wire up the repeatable job, connect to `SendDispatcherService` (stub is fine until GC-045 lands; can call `SesSenderProvider` directly for now).
**Acceptance criteria:**
- A 3-step sequence with short test delays (minutes, not days) runs end-to-end against a test contact.
- Pausing mid-sequence (via direct service call, webhook lands in GC-041) stops further sends within one runner tick.

**Unblocked 2026-07-12**: BullMQ repeatable job (`upsertJobScheduler`, every 10s in dev — CLAUDE.md invariant 10, no setTimeout/cron loop) calling `SequenceRunnerService.tick()`, which queries due active enrollments and, per-enrollment, re-checks status immediately before executing (invariant 3) before touching `currentStepId`. Calls `SesSenderProvider` directly per the ticket's note (`SendDispatcherService` is GC-045). "wait" steps are pure delay markers — the runner sums consecutive waits and lands on the next executable step (`step-resolution.util.ts`), fixed the same way in `EnrollmentService.enroll()` for a sequence that starts with a wait. Resolves personalization tokens *before* spintax (a real bug the tests caught: spintax's `{a|b}` parser was mis-parsing `{{contact.firstName}}`'s doubled braces as a nested spintax group and eating them) — see CLAUDE.md invariant 5 note.

Verified via 2 real-DB Jest integration tests: a paused enrollment with an overdue `nextRunAt` is not processed at all (0 sends, `currentStepId` unchanged) — direct proof of invariant 3; a 3-step sequence (send_email → wait 1min → exit) runs across two ticks (backdating `nextRunAt` to avoid a real 60s sleep, same tick logic either way) ending `completed`. Also verified live end-to-end through the *actual* BullMQ scheduler (not a direct test call) against a real running app: enrolled a contact via raw SQL, waited 14s with zero manual intervention, and watched the real repeatable job fire, resolve personalization ("Hi Grace"), attempt a real SES send that failed clearly (no AWS creds — expected, not faked), and mark the enrollment `completed`.

### GC-033 — Admin UI: sequence builder
Visual step editor: add/remove/reorder steps, pick template per step, set delay.
**Acceptance criteria:**
- Building and saving a 3-step sequence through the UI produces the same DB state as building it via direct API calls.

### GC-034 — Admin UI: contact enrollment panel
Import `ContactEnrollments.tsx` reference implementation onto the contact detail page.
**Acceptance criteria:**
- Pause/resume/stop buttons work against a real enrollment and reflect status changes without a manual page refresh.

**Unblocked 2026-07-12**: reference implementation never arrived, so built fresh — `ContactEnrollments.tsx` calling GC-042's admin endpoints, dropdown to enroll into any not-currently-enrolled sequence, per-enrollment status badge + Pause/Resume/Stop (hidden for viewer role).

Verified live in Chrome: enrolled a contact into a real sequence via the UI (card appeared instantly, no reload), clicked Pause (badge flipped active→paused, buttons swapped to Resume/Stop, no reload), clicked Resume (flipped back to active), all against the real backend with real DB state changes each time.

### GC-035 — Condition-based trigger engine
`Trigger` + `TriggerCondition` schema, JSON-logic-style evaluator (`equals/contains/gt/lt/in/exists`, AND/OR groups), evaluation worker triggered off internal events.
**Acceptance criteria:**
- A trigger configured for "tag X added" correctly enrolls a contact into the linked sequence when that tag is added, and does not fire for unrelated field changes.
- Evaluator has test coverage for at least each supported operator.

**Blocked 2026-07-11**: depends on GC-031 (blocked) — trigger-driven enrollment needs `EnrollmentService` to exist.

**Unblocked 2026-07-12**: `triggers` table (`name, eventType, conditions jsonb, sequenceId fk→sequences cascade, isActive`) — one JSONB condition tree per trigger rather than a separate normalized `TriggerCondition` table, since the tree is only ever read/written whole, never queried by individual leaf. Pure `evaluateCondition(node, context)` in `condition-evaluator.ts`, no DB/Nest dependency, 8/8 unit tests covering every op (`equals/contains/gt/lt/in/exists`) plus nested AND/OR groups. `TriggerEvaluationService` listens on the event bus (GC-037) via explicit `@OnEvent()` per event type (not wildcard) — `contact.created`, `contact.tag_added`, `contact.field_changed`, `contact.list_joined`, `email.opened`, `email.clicked` — loads active triggers for that event type, evaluates, and on match calls `EnrollmentService.enroll()` (invariant 2, same shared service as the webhook/admin controllers). `TriggersController` behind `JwtAuthGuard`+`RolesGuard`, writes require owner/editor.

Verified live: created a trigger (`contact.tag_added`, condition `{field:'tagName', op:'equals', value:'TriggerTag'}` → linked sequence with one `exit` step), added an unrelated tag to a real contact first — confirmed no enrollment (`GET /admin/sequences/contacts/:id` → `[]`). Then added the matching tag — confirmed real enrollment row created (`status: active`, `currentStepId` = the sequence's step) within ~1s of the real HTTP call, no polling/manual trigger needed.

**UI added 2026-07-12** (see the full cross-check pass note near the end of this file): `Triggers.tsx` + `NewTriggerModal.tsx` at `/triggers` — real trigger list (pause/resume/delete), create flow supporting both condition-based and schedule-based types with a real sequence picker. Deliberately simplified vs the design's nested AND/OR condition-group builder: the modal only builds a single leaf condition (`{field, op, value}`), even though the backend's `evaluateCondition()` fully supports nested groups — a multi-row/multi-group visual builder is a much bigger UI investment the ticket text never asked for. Existing triggers also can't have their conditions edited after creation (only paused/resumed/deleted) — same reasoning. Also omitted the design's third "webhook" trigger type entirely, since that would duplicate GC-041's existing per-sequence webhook enroll endpoints as a second, overlapping mechanism with no ticket backing it.

### GC-036 — Schedule-based trigger (BullMQ repeatable)
Recurring trigger evaluation (cron-style) plus one-off scheduled campaign sends, timezone-aware.
**Acceptance criteria:**
- A "every Monday 9am" recurring trigger fires correctly across a simulated multi-week test.
- A one-off scheduled campaign set for a specific future timestamp in a specific timezone sends at the correct wall-clock time in that timezone.

**Blocked 2026-07-11**: depends on GC-032 (blocked).

**Split 2026-07-12**: this ticket bundles two independent capabilities — split rather than silently narrowing scope (per CLAUDE.md's ticket-splitting rule).

*Recurring cron-style trigger — Done.* Added `scheduleCron`/`scheduleTimezone` columns to `triggers` (set only when `eventType: 'schedule'`). `ScheduleTriggerSchedulerService` upserts/removes one BullMQ repeatable job per active schedule trigger, keyed by the trigger's own id, using BullMQ's native cron+tz repeatable-job support directly (no hand-rolled cron matcher — invariant 10) — `TriggersService.create/update/remove` keeps the job in sync, and `onModuleInit` re-registers every active schedule trigger's job on boot so restarts are self-healing. `ScheduleTriggerProcessor` re-checks the trigger's active status at fire time (invariant 3 pattern) and evaluates `evaluateCondition` against every contact's *live* current state (`buildContactContext`: fields + joined tag names) rather than a one-shot event payload, since there's no originating event for a scheduled fire.

Found and fixed a real bug during live verification: naively calling `EnrollmentService.enroll()` for every match on every tick re-enrolls the same contact endlessly once their prior enrollment completes, because `enroll()` only guards against a currently active/paused enrollment (invariant 1), not a completed one. Fixed by having the processor pre-filter against *any* existing enrollment (any status) for that trigger's sequence before evaluating — a schedule trigger enrolls each matching contact at most once ever per target sequence, not once per tick it still matches.

Verified live in two rounds: (1) pre-fix — a `* * * * *` UTC trigger matching a tagged contact fired 3 times across 3 minutes and created 3 separate enrollment rows for the same contact (confirming the bug), with a negative-control untagged contact never enrolled across the same window; (2) post-fix — a fresh identical trigger against the same already-enrolled contact logged `0 matched, 0 newly enrolled` on both of the next 2 ticks, and `sequence_enrollments` still held exactly the 3 pre-fix rows (no growth). Full Jest suite (37/37) and `tsc --noEmit` clean after the fix.

*One-off scheduled campaign send, timezone-aware — folded into GC-020/021b* (task queue #60, not yet started). This half genuinely needs GC-020's campaign send flow to exist first (there's nothing to schedule against yet — `campaigns` table exists but has no service/controller). Building it here would mean building GC-020 prematurely and out of order. When GC-020/021b lands, add `scheduledAt`/`timezone` columns to `campaigns` and a BullMQ delayed job (not a new repeatable-job type) that fires the send at the correct wall-clock instant in the campaign's configured timezone.

### GC-037 — Internal event bus wiring
Wire `EventEmitter2` (or chosen equivalent) emissions into contact/list/tag mutation points: `contact.created`, `contact.tag_added`, `contact.field_changed`, `contact.list_joined`, plus the email events from GC-019 (`email.opened`, `email.clicked`, `email.bounced`).
**Acceptance criteria:**
- Every event type GC-035's trigger engine depends on is actually emitted somewhere in the codebase — cross-check against the trigger engine's supported `event_type` values.

**Blocked 2026-07-11**: depends on GC-035 (blocked). Also partly on GC-019 (blocked, no AWS SES).

**Unblocked 2026-07-12**: `EventEmitterModule.forRoot()` wired globally in `app.module.ts` (same pattern as `ConfigModule.forRoot({isGlobal:true})`). Real emit sites added at every mutation point: `ContactsService.create()` → `contact.created`, `ContactsService.update()` → one `contact.field_changed` per changed field, `TagsService.addContact()` → `contact.tag_added`, `ListsService.addContact()` → `contact.list_joined`. `TrackingService`/`SuppressionService`/`SequenceRunnerService` — previously calling `OutboundWebhookDispatchService.emit()` directly (GC-043's original build-order shortcut, noted below) — refactored to emit on `EventEmitter2` instead (`email.opened`, `email.clicked`, `email.bounced`, `email.complained`, `email.unsubscribed`, `sequence.completed`), decoupling them from the outbound-webhook module entirely. `OutboundWebhookEventListener` (new, `src/events/`) now bridges the bus to GC-043's dispatcher with one explicit `@OnEvent()` handler per event type — 10 total, matching the trigger engine's supported list plus the send-lifecycle events triggers don't act on.

Verified live end-to-end: created a subscription (`POST /outbound-webhook-subscriptions`, `eventTypes:['contact.created']`) pointed at a local HTTP receiver, created a real contact via `POST /contacts` — receiver got a real POST within ~2s carrying `X-Event-Type: contact.created` and the HMAC-signed payload, proving the full chain (`ContactsService` → `EventEmitter2` → `OutboundWebhookEventListener` → `OutboundWebhookDispatchService` → BullMQ job → HTTP delivery) works through the new architecture, not just the trigger-engine path. Full Jest suite (37/37) and `tsc --noEmit` clean after the refactor.

---

## Sprint 3 — Integration surface

### GC-040 — Inbound webhook framework (HMAC)
`WebhookEndpoint` + `WebhookDelivery` schema, HMAC verification middleware/guard, generic payload-to-contact-field mapping.
**Acceptance criteria:**
- An unsigned or incorrectly-signed request is rejected with 401 before any processing.
- Every inbound call (valid or not) is logged to `WebhookDelivery` for replay/debugging.

### GC-041 — Sequence webhook controller
Import the reference implementation: `POST /webhooks/in/sequences/:id/{enroll,pause,resume,stop}`.
**Acceptance criteria:**
- Calling each endpoint via `curl` with a correctly-signed request against a real sequence and contact produces the expected `SequenceEnrollment` status change.
- Reuses `EnrollmentService` from GC-031 — no duplicated state-transition logic (per `CLAUDE.md` invariant 2).

**Unblocked 2026-07-12**: each sequence gets its own generated `webhookSecret` (invariant 4 — per-endpoint secret, not a bare URL token). `POST /webhooks/in/sequences/:id/{enroll,pause,resume,stop}` verifies `X-Signature`, logs every call to `webhook_deliveries` before processing (reusing GC-040's framework), then calls `EnrollmentService` directly.

Verified live: unsigned enroll → 401; correctly-signed enroll → 201 with the real enrollment row; a second signed enroll on the same contact → 409. Then a fuller cross-controller run (below, shared with GC-042).

### GC-042 — Admin enrollment controller
Import the reference implementation: JWT-authenticated equivalent of GC-041 for the admin UI (GC-034) to call.
**Acceptance criteria:**
- Produces identical `SequenceEnrollment` state changes to GC-041 for the same logical action.

**Unblocked 2026-07-12**: `/admin/sequences/:id/{enroll,pause,resume,stop}` (JWT + owner/editor roles) calls the exact same `EnrollmentService` methods as GC-041 — no parallel state-transition logic.

Verified live end-to-end across both controllers on the same enrollment: enrolled via the public signed webhook → paused via the public webhook → checked status via the JWT-authenticated admin listing endpoint (showed `paused`, matching) → resumed via the admin controller → stopped via the public webhook again. Every transition landed exactly as expected regardless of which controller triggered it.

### GC-043 — Outbound webhook dispatcher
Let external systems subscribe to internal events (open/click/bounce/sequence-completed/etc.) via a registered outbound webhook URL, with retry/backoff on delivery failure.
**Acceptance criteria:**
- A test receiving endpoint (e.g. a local ngrok tunnel or webhook.site) gets a correctly-formed payload when a subscribed event fires.
- A failing receiver gets retried with backoff, not hammered or silently dropped after one attempt.

**Unblocked 2026-07-12**: didn't wait on GC-037's full event bus — `OutboundWebhookDispatchService.emit(eventType, payload)` is called directly from the three services that actually produce these events (`SequenceRunnerService` on `sequence.completed`, `TrackingService` on `email.opened`/`email.clicked`, `SuppressionService` on `email.bounced`/`email.complained`/`email.unsubscribed`), each fan-out delivery a separate BullMQ job (`attempts: 5`, exponential backoff) — invariant 10. `outbound_webhook_subscriptions` stores per-subscription HMAC secrets; deliveries carry `X-Signature`/`X-Event-Type` headers.

Verified live against a real local HTTP receiver (not a mock): registered a subscription, enrolled a contact into a completes-immediately sequence, and watched 3 real delivery attempts land — the receiver deliberately 500'd the first two and 200'd the third, confirmed via BullMQ's own attempt counter and the receiver's own request log, each attempt carrying a valid `X-Signature`. Not hammered (real ~2s/4s exponential spacing between attempts) and not silently dropped (all 3 attempts logged).

**UI added 2026-07-12** (see the full cross-check pass note near the end of this file): `Webhooks.tsx` at `/webhooks` — real inbound endpoints + outbound subscriptions lists, create forms for both (the design doesn't show create affordances here, but without one the feature would only be reachable via raw API calls, inconsistent with every other screen this session). Delivery log shows real `webhook_deliveries` rows for the most-recently-created inbound endpoint only — the design implies one merged inbound+outbound delivery log, but outbound delivery attempts are BullMQ job history, not a durable queryable table, so they can't be shown; noted as a real data-model gap rather than faked.

### GC-044 — Gmail OAuth connect flow
Import the reference implementation: Google Cloud OAuth client setup (Internal user type), `/sender-accounts/gmail/connect` + `/callback`, encrypted refresh token storage.
**Acceptance criteria:**
- Connecting a real Gmail Workspace test mailbox succeeds and stores an encrypted refresh token.
- Reconnecting the same mailbox updates rather than duplicates its `SenderAccount` row.

**Blocked 2026-07-11**: `GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET` are empty in `.env`, and the Gmail Workspace reference implementation named in `CLAUDE.md` isn't in this repo — needs both a real Google Cloud OAuth client and the reference implementation pasted in.

**Unblocked 2026-07-12**: reference implementation never arrived, built fresh (GC-044 through GC-047 together, since they're one coherent feature). `sender_accounts` table (provider `ses|gmail`, email, dailySendLimit, sentToday, sentTodayDate, isActive, `gmailRefreshTokenEncrypted`). `GmailOAuthService.getConnectUrl()`/`handleCallback()` uses `googleapis`' `google.auth.OAuth2`, scoped to `gmail.send`+`gmail.readonly`+`userinfo.email`, `access_type: offline`+`prompt: consent` to guarantee a refresh token every time. Refresh tokens are AES-256-GCM encrypted at rest (`token-encryption.util.ts`, keyed by `TOKEN_ENCRYPTION_KEY`) — 3 Jest tests confirm the round-trip and that a wrong key fails to decrypt. `GET /sender-accounts/gmail/callback` is intentionally public (Google's redirect can't carry our JWT) but CSRF-protected by a signed, 10-minute-expiring `state` param (`oauth-state.util.ts`, same HMAC-sign/verify shape as GC-019's unsubscribe token) generated at `/connect` time. `SenderAccountService.upsertGmailAccount()` matches by email, so reconnecting updates the existing row rather than duplicating it (ticket's second acceptance criterion, verifiable by code inspection — needs a real OAuth round-trip to exercise live).

**Deviation**: `.env`'s `GOOGLE_OAUTH_CLIENT_ID`/`SECRET`/`REDIRECT_URI`/`TOKEN_ENCRYPTION_KEY` are all still empty, so the actual 3-legged OAuth consent flow (the part that requires a real Google Cloud project + browser-based user consent) could not be exercised live — verified instead that `/sender-accounts/gmail/connect` throws the exact clean "not configured" error rather than a fake URL, both via curl and a full browser pass. **Sharifur: once a real Google Cloud OAuth client (Internal user type) and `TOKEN_ENCRYPTION_KEY` (`openssl rand -hex 32`) are in `.env`, connect a real Gmail Workspace test mailbox and confirm the full round-trip — code path is ready, this exact flow is what needs a human with real Google credentials.**

### GC-045 — SendDispatcherService (SES + Gmail rotation)
Import the reference implementation: `SenderAccountService.pickAccountForSend()`, `EmailSenderProvider` interface, `SendDispatcherService`. Wire GC-032's runner and GC-020's campaign flow to go through this instead of calling SES directly.
**Acceptance criteria:**
- With one Gmail account and SES both active, sends alternate based on quota headroom, verifiable by inspecting `sentToday` on each `SenderAccount` after a batch of test sends.
- Exhausting a Gmail account's daily quota causes subsequent sends to route to SES (or another Gmail account) automatically, not to error out.

**Blocked 2026-07-11**: depends on GC-044 (blocked) and GC-017 (blocked, no AWS SES).

**Unblocked 2026-07-12**: `SenderAccountService.pickAccountForSend()` sorts all active accounts by remaining headroom (`dailySendLimit - sentToday`, reset when `sentTodayDate` rolls to a new day) and returns the one with the most — SES's account row is materialized lazily (`ensureSesAccount()`) the first time anything needs to pick a sender, since SES has no OAuth connect step of its own but still needs to participate in the same rotation table (invariant 7). `SendDispatcherService.send()` is now the *only* thing `SequenceRunnerService`/`CampaignSendProcessor` call — both were refactored off calling `SesSenderProvider` directly. Quota is recorded (`recordSend()`, an atomic `sentToday + 1`) only on a successful send, so a failed attempt never eats into the account's daily limit.

Verified live: sent a real campaign through the new dispatcher path with no sender accounts existing yet — confirmed a `sender_accounts` row for SES was created automatically (`dailySendLimit: 50000`, `sentToday: 0`), the send correctly failed with the same clean SES-not-configured error as before (proving the refactor didn't change failure behavior), and `sentToday` correctly stayed at 0 (a failed send must not consume quota). Rotation across an active Gmail + SES pair, and the "exhausted Gmail falls through to SES" criterion specifically, can't be demonstrated without a real connected Gmail account (GC-044) — the selection logic itself (sort by headroom, skip exhausted/inactive) has no external dependency and is straightforward to inspect; flagging rather than claiming a live multi-account test that didn't happen.

### GC-046 — Gmail bounce scanner (DSN polling)
Import the reference implementation: 15-minute inbox-poll job, DSN parsing.
**Acceptance criteria:**
- A deliberately-bounced test send from a connected Gmail account is detected within one poll cycle and logged (feeding into the suppression list per the "soft signal" note in `CLAUDE.md`).

**Blocked 2026-07-11**: depends on GC-044/GC-018 (blocked).

**Unblocked 2026-07-12**: `GmailBounceScannerProcessor` — BullMQ repeatable job every 15 minutes (`SendingModule.onModuleInit`, same `upsertJobScheduler` pattern as the sequence runner and schedule triggers, invariant 10), one per active connected Gmail account. Searches `from:mailer-daemon OR subject:"Delivery Status Notification" OR subject:"Undelivered Mail"` since the account's `gmailLastBounceScanAt`, parses the DSN's `Final-Recipient: rfc822; ...` field to get the bounced address, and calls `SuppressionService.recordSoftBounce()` — never an immediate hard suppress — matching invariant 9's explicit note that a single Gmail-detected bounce is a softer signal than SES's structured SNS events. Quietly returns `{accountsScanned: 0, bouncesFound: 0}` rather than logging an error every 15 minutes when Gmail isn't configured at all — this is an unconnected-feature no-op, not a failure.

`extractBouncedRecipient()` (the one genuinely pure, unit-testable piece of this) has 3 Jest tests: parses a real DSN field, is case-insensitive, returns null on a non-bounce body. The actual Gmail-inbox-polling half needs a real connected account (GC-044) to exercise for real — noted rather than claimed.

### GC-047 — Admin UI: sender accounts
Import the reference implementation: `SenderAccountsSettings.tsx`, quota bars, connect button.
**Acceptance criteria:**
- Shows live `sentToday`/`dailySendLimit` for every connected account, matching the DB state.

**Blocked 2026-07-11**: depends on GC-044 (blocked).

**Unblocked 2026-07-12**: `SenderAccountsSettings.tsx` at `/settings/sender-accounts`, `senderAccountsApi.ts` client. Quota bar color follows the exact green/amber/red thresholds `DESIGN_TOKENS.md` specifies for this screen (<70/70–90/>90%). Scoped to what the backend actually supports — daily quota only, no hourly cap or email-signature editor, since neither exists server-side and no ticket asks for them; the design shows both, noted as a design/ticket mismatch rather than built as dead UI.

Verified live (Chrome extension was disconnected this session, used the Playwright fallback again): real SES account card renders with the correct live `sentToday`/`dailySendLimit` (0/50000) after the GC-045 live test above, "Connect Gmail account" button correctly surfaces the clean "TOKEN_ENCRYPTION_KEY is not configured" error inline rather than failing silently or navigating anywhere fake.

### GC-048 — Local verification pre-filter
Syntax regex, MX record lookup (`dns.resolveMx`), disposable-domain blocklist check — all before any paid API call.
**Acceptance criteria:**
- A syntactically invalid address, a domain with no MX record, and a known disposable-domain address are all rejected without any external API call being made (verify via request logging/mocking in a test).

### GC-049 — Reoon + NeverBounce verification integration
Paid-API step for addresses that pass GC-048, cached in `VerificationResult` with a 6–12 month TTL. Reoon primary, NeverBounce fallback behind the same interface.
**Acceptance criteria:**
- Verifying the same address twice within the TTL window makes only one external API call, confirmed via request count.
- Reoon being unavailable (mocked failure) correctly falls back to NeverBounce rather than failing the whole verification.

**Blocked 2026-07-11**: `REOON_API_KEY`/`NEVERBOUNCE_API_KEY` are both empty in `.env` — no real API keys to call, and this ticket should not use mocked provider responses per `CLAUDE.md`.

**Unblocked 2026-07-12**: `verification_results` table (email unique, status, isDeliverable, provider, expiresAt — 180-day TTL, within the ticket's 6-12 month window). `ReoonProvider`/`NeverBounceProvider` implement one `EmailVerificationProvider` interface; `EmailVerificationService.verify()` runs local pre-filter (GC-048) → cache lookup → Reoon → NeverBounce fallback, in that order, each step short-circuiting the next on success. `POST /verification/check` (owner/editor only, since every real call can cost money once keys are configured) is separate from GC-048's existing free `/verification/local-check`.

Clarifying the "should not use mocked provider responses" note from the original blocked status: that rule is about the *shipped application* never faking a real API result at runtime (matches the pattern used for SES/R2/Gmail throughout this session) — it doesn't forbid a unit test from mocking the HTTP boundary to verify orchestration logic, which is exactly what this ticket's own acceptance criteria call for (proving caching and fallback behavior via request-count assertions). Wrote 3 such tests against the *real* `ReoonProvider`/`NeverBounceProvider`/`EmailVerificationService` code with only `global.fetch` mocked: (1) an invalid-syntax address makes zero external calls; (2) verifying the same address twice makes exactly one Reoon call, the second call served entirely from the DB cache; (3) a failing Reoon call correctly falls through to NeverBounce rather than failing the whole verification — both of GC-049's stated acceptance criteria directly proven, not just asserted.

Live-verified the actually-configurable part (real keys aren't in `.env`): `POST /verification/check` for an invalid address returns the local rejection immediately with zero external calls (confirmed via log), and for a syntactically valid address correctly attempts Reoon, logs the clean "not configured" warning, falls through to NeverBounce, and surfaces *that* provider's clean "not configured" error rather than any fake success — exactly the same "try in order, never fake it" behavior the tests already proved, now shown against the real (unconfigured) HTTP path too. **Sharifur: once real `REOON_API_KEY`/`NEVERBOUNCE_API_KEY` are in `.env`, the response field mapping (`reoon.provider.ts`/`neverbounce.provider.ts`'s `status`/`result` value handling) is based on each provider's public docs but hasn't been checked against a real response — worth a quick live call to confirm the mapping is right before relying on it.**

Design surfaced a `VERIFICATION` screen (bulk-verify button, per-status stat cards, credits-remaining balance) that GC-049's own acceptance criteria never asked for — split out as GC-062 rather than built here.

---

## Sprint 4 — Safety net & polish

### GC-050 — Bounce-rate circuit breaker
Rolling-window bounce/complaint rate check (e.g. last 500 sends). Crossing a threshold auto-pauses active sequences/campaigns and flags for review.
**Acceptance criteria:**
- A simulated burst of bounces in a test run trips the breaker and verifiably pauses active sends within one evaluation cycle.
- Breaker state and threshold are configurable, not hardcoded.

**Blocked 2026-07-11**: depends on GC-018/GC-032 (blocked).

**Unblocked 2026-07-12**: `breaker_evaluations` (history, one row per evaluation cycle — auditable, not a single mutable flag) + `breaker_resets`. Discovered while designing this that `sends.status` was never actually updated to `bounced`/`complained` after the initial send — the SES SNS handler only ever touched the suppression list, so "rolling bounce rate over the last N sends" had no real data source. Fixed at the root: `SesSnsController` now correlates the SNS notification's `mail.messageId` back to the matching `sends` row via `providerMessageId` and updates its status — this also means the email log (GC-060, not yet built) will have accurate historical statuses, not just this ticket's rolling window.

`CircuitBreakerService.evaluate()` (BullMQ repeatable, every 5 minutes — invariant 10) reads the last `CIRCUIT_BREAKER_WINDOW_SIZE` (default 500, configurable) sends, computes bounced+complained rate, trips if it's ≥ `CIRCUIT_BREAKER_THRESHOLD_PCT` (default 5%, configurable) — both via env, not hardcoded, satisfying the ticket's second criterion directly. A trip pauses every active sequence enrollment through the one shared `EnrollmentService.pause()` (invariant 2) — never a direct bulk DB update, even from a safety-net feature. Critically, `SendDispatcherService.send()` also calls `assertNotTripped()` on every single send, so a trip blocks in real time rather than only at the next 5-minute cycle. Never auto-heals — `POST /circuit-breaker/reset` (owner-only) is the only way to clear it, matching "flags for review."

Verified live end-to-end at the real HTTP layer, not just against the service directly: simulated a tripped state via a direct DB row (equivalent to what a real bounce burst produces), confirmed `/circuit-breaker/status` reflected it, then attempted a real campaign send through the actual `POST /campaigns/:id/send` → `SendDispatcherService` path — the send correctly failed with the exact circuit-breaker message on the `sends` row, proving the real-time gate works through the whole stack, not just in isolation. Reset correctly un-tripped it. Also 2 real-DB Jest tests: a healthy history doesn't trip; a 25%-bounce burst trips it, pauses a real active enrollment (confirmed via `EnrollmentService.findOne()` showing `status: paused`), and a reset un-trips it.

### GC-051 — Slack notifications
Webhook-based Slack alerts for: circuit breaker tripped, campaign finished, verification credits low, large-send confirmation (ties to GC-053).
**Acceptance criteria:**
- Each event type produces a distinct, readable Slack message, not a generic "something happened."

**Blocked 2026-07-11**: depends on GC-050 (blocked). Would also need a real Slack webhook URL, not yet in `.env`'s tracked var list.

**Unblocked 2026-07-12**: `SLACK_WEBHOOK_URL` added to `.env`/`.env.example` (still empty). `SlackNotificationService.sendBestEffort()` never lets a Slack outage break the event it's reacting to — every listener catches its own failure and logs a warning rather than propagating. `SlackEventListenerService` has one explicit `@OnEvent()` per event type (invariant 12), each producing a genuinely distinct message: circuit breaker trip (rate/threshold/paused count), campaign finished (sent/failed/suppressed counts), large-send confirmed (recipient count vs threshold). Added `campaign.completed` as a new emitted event (`CampaignSendProcessor`) since nothing previously signaled campaign completion on the bus. Skipped "verification credits low" — no credit-balance data exists anywhere yet (GC-062 explicitly punted faking that number), so there's nothing real to alert on; noted as a GC-062 follow-up rather than wiring a fake trigger.

Verified live: triggered real `campaign.completed` events (one per real send test) and confirmed the listener fired, attempted a real Slack POST, hit the clean "not configured" error, logged it as a non-fatal warning — and the campaign itself completed successfully regardless, proving Slack really is best-effort and never load-bearing.

### GC-052 — Dry-run / send-to-self mode
Flag on campaign/sequence sends that renders the final resolved email but routes to a fixed internal test list (or just logs it) instead of real contacts.
**Acceptance criteria:**
- Dry-run mode never touches `SenderAccount.sentToday` counters or real contacts, verified by checking those are unchanged after a dry run.

**Blocked 2026-07-11**: depends on GC-020/GC-032 (blocked) — no real send path to short-circuit yet.

**Unblocked 2026-07-12**: the safety-critical half of this ticket (never touch quota, never really send) was actually already built and tested in GC-020 — `campaign.isDryRun` skips `SendDispatcherService` entirely, so `recordSend()` (which increments `sentToday`) is never even called; already covered by GC-020's `campaign-send.processor.spec.ts`. This pass adds the other half the ticket's own description asks for ("routes to a fixed test list"): a new `campaigns.sendToEmail` field — when set, every recipient's fully-resolved, personalized email is really sent (real quota consumption, real provider call) but redirected to that one address, subject-prefixed `[Test → real@recipient.com]` so a QA reviewer can tell who it was really meant for. Deliberately distinct from `isDryRun`: dry-run means "never send," `sendToEmail` means "really send, just redirected" — useful for actually eyeballing a resolved email in an inbox before a real campaign goes out, which pure dry-run can't give you.

Live-verified `isDryRun` never reaches the sender (unchanged from GC-020's test) and that `sendToEmail` persists correctly on a real campaign end-to-end through the UI. The actual redirect (does the real "to" address get overridden) can't be observed without real SES/Gmail credentials — the send fails at the config-check step before any address is used, same limitation as everywhere else this session credentials are missing. Code path (`campaign-send.processor.ts`'s `sendTarget = campaign.sendToEmail || contact.email` ternary) is small and easy to verify by inspection; flagging rather than claiming a live redirect test that didn't happen.

### GC-053 — Pre-send confirmation summary
UI + API check: sends above a configurable recipient threshold require an explicit confirm step showing recipient count, list, and template name.
**Acceptance criteria:**
- Attempting to send above the threshold without confirmation is blocked server-side, not just hidden client-side.

**Blocked 2026-07-11**: depends on GC-020 (blocked).

**Unblocked 2026-07-12**: `LARGE_SEND_THRESHOLD` (env, default 5000 — matches the design's "over 5,000" hint). `CampaignsService.send()` counts the real list membership and returns `{status: 'confirmation_required', recipientCount, threshold}` instead of enqueueing when over threshold and `confirmed` wasn't explicitly passed — this is the actual server-side block the acceptance criterion asks for, not a client-side hide; a raw API call without `confirmed: true` is provably rejected regardless of what the UI does. `CampaignCompose.tsx` shows the design's large-send acknowledgment checkbox (recipient count + threshold spelled out) and only re-sends with `confirmed: true` once checked; the "Send campaign" button is disabled while a confirmation is pending, so there's no way to bypass it through the UI either.

Verified live in two ways: (1) 2 real-DB Jest tests with the threshold overridden to 3 — a 5-recipient send is correctly blocked (`confirmation_required`, campaign stays `draft`, nothing enqueued) and correctly proceeds once `confirmed: true` is passed (`largeSendConfirmed` persisted); (2) a full browser pass (Playwright, threshold temporarily set to 1 in local `.env` for the test, reverted after) against a real 5-contact list — the confirmation banner rendered with the exact real recipient count and threshold, "Send campaign" stayed disabled until the checkbox was clicked, and confirming navigated to the campaign detail page as expected.

### GC-054 — Spintax resolved-preview UI
"Shuffle" button in the template editor showing a few random resolved variants side by side.
**Acceptance criteria:**
- Clicking shuffle re-resolves and displays a new set of variants without a full page reload.

### GC-055 — Image compression + EXIF stripping
Client-side resize/re-encode and EXIF strip before upload to R2.
**Acceptance criteria:**
- A large (>2MB) test photo with EXIF GPS data results in a smaller, EXIF-stripped file in R2 — verify by inspecting the uploaded object's metadata.

**Blocked 2026-07-11**: depends on GC-015 (blocked, no R2 credentials).

**Unblocked 2026-07-12**: built alongside GC-015. `compressAndStripExif()` (`apps/web/src/lib/imageProcessing.ts`) uses `createImageBitmap` + a canvas re-encode (max dimension 1600px, JPEG quality 0.82) — re-encoding through canvas pixel data is what strips EXIF, since the canvas never carries the source file's metadata into `toBlob()`'s output; there's no separate "strip" step because the re-encode itself can't produce EXIF. Verified live: a real 2000×1500 photo (converted from a `.heic` system wallpaper, 251KB) ran through the compress step with no error before hitting the (expected, unconfigured) R2 presign call — full acceptance criterion of "results in a smaller, EXIF-stripped file" can't be fully confirmed until real R2 credentials let the object actually land in the bucket for inspection; the client-side logic itself is verified correct and exercised for real.

### GC-056 — Lightweight RBAC
`owner | editor | viewer` role on templates/sequences/lists.
**Acceptance criteria:**
- A `viewer`-role test user can be verified (via API test) unable to save changes, while able to read.

**Unblocked 2026-07-11**: Sharifur decided minimal JWT auth (see `CLAUDE.md` architectural decision 11). Built `users` table (owner/editor/viewer), `POST /auth/register` (first registered user becomes owner, everyone after defaults to viewer — no separate invite flow yet), `POST /auth/login`, JWT guard + roles guard applied to templates/sequences/lists controllers (read = any authenticated role, write = owner/editor only). Frontend: `/login` page, `useAuthStore` (persisted), `ProtectedRoute` wrapping the whole app shell, write controls hidden for viewer role in TemplateEditor/SequenceBuilder/ContactDetail's list toggles.

Verified live: registered two users (first became owner, second defaulted to viewer); viewer POST to `/templates` returned 403 while GET succeeded; owner POST succeeded. UI confirmed too — viewer's Save button is hidden in the template editor.

### GC-057 — Audit log
Record who changed a template, paused a sequence, exported a list, etc.
**Acceptance criteria:**
- Every mutation covered by GC-056's RBAC check also produces an audit log entry with actor, action, and timestamp.

**Unblocked 2026-07-11**: `audit_log` table + `AuditLogService`, called from every write endpoint on templates/sequences/lists (create/update/delete, plus sequence step add/update/remove/reorder and list contact add/remove). `GET /audit-log` is owner-only. Verified live: an owner's template creation produced a matching audit_log row with actorEmail/action/entityType/entityId; a viewer got 403 on the audit-log endpoint.

**UI added 2026-07-12** (see the full cross-check pass note near the end of this file): `Settings.tsx` at `/settings` — three real, working tabs (Members: real user list + owner-only inline role change via `PATCH /users/:id/role`; Audit log: real `audit_log` rows; Suppression list: real `suppression_list` rows). Design's fourth tab, "Compliance" (default unsubscribe method picker, reply stop-word auto-suppression), has no backend anywhere in the codebase — reply-based auto-suppression was never specced or built as a feature — so it's omitted rather than shipped as dead UI. "Invite" button also omitted: invariant 11 explicitly documents there's no invite-by-email flow, only self-registration + an owner promoting via role change, which the Members tab already does.

### GC-058 — Analytics dashboard
Open/click/bounce rates per campaign and sequence, basic trend view. Design: `DASHBOARD` section.
**Acceptance criteria:**
- Dashboard numbers match a manual `SELECT count(*)`-style spot check against `EmailEvent`/`Send` tables for at least one real test campaign.

**Blocked 2026-07-11**: depends on GC-019/GC-032 (blocked) — no `EmailEvent`/`Send` data to aggregate yet.

**Unblocked 2026-07-12**: `AnalyticsService` (real aggregate SQL, no synthetic/placeholder numbers anywhere) — `getOverview()` (sent/failed/bounced/complained/suppressed counts + open/click/bounce rate over a configurable day window), `getEngagementTrend()` (real daily open/click group-by for the chart), `getRecentCampaigns()` (real per-campaign open/click counts), `getRecentActivity()` (real recent event feed). `Dashboard.tsx` replaced its health-check placeholder entirely: stat cards, a hand-rolled SVG trend line (no charting library — a 30-point polyline didn't justify a new dependency), recent campaigns table, recent activity feed.

**Scope deviation**: skipped the design's "sending health composite score" (a `/100` number with sub-metric bars) — no ticket specifies what formula composes it, and inventing one would be exactly the kind of fabricated number this session has consistently avoided (e.g. GC-062's "don't fake credits remaining" note). Flagging rather than guessing at a scoring formula nobody asked for.

Verified live in Chrome... this session's Chrome extension was disconnected, so used Playwright (per `CLAUDE.md`'s stated fallback): dashboard rendered real accumulated data from the whole session's testing (11 real sent, 5 real recent campaigns with correct per-campaign open/click counts and status badges) — not zeros, not placeholders. Directly proved the ticket's own acceptance criterion with 2 real-DB Jest tests: inserted a hand-countable mix of sends/events (3 sent, 1 bounced, 1 suppressed, 2 opens, 1 click), ran a genuinely separate manual `.filter()` count against the raw rows, and asserted the service's real query results are consistent with that manual count — not just "the code looks right," an actual spot-check against independently-counted data.

### GC-059 — AI-assisted template copy
Surfaced by the design's `AI ASSIST MODAL` — a prompt-to-copy tool inside the template editor (write a brief, get generated subject/body copy, optionally refine with quick actions like "make it shorter," insert into the editor). **Blocked**: needs a decision on LLM provider (Anthropic or OpenAI) and a real API key from Sharifur before this can start — do not stub this with a fake/mocked response and mark it done, and do not pick a provider unilaterally.
**Acceptance criteria (once unblocked):**
- Generated copy is inserted into the editor as plain resolvable content — it doesn't bypass the spintax/personalization-token system from GC-016.
- API key is read from env (never hardcoded), and the modal clearly labels output as AI-generated per the design's footer copy ("AI-generated · review before sending").
- A missing/invalid API key produces a clear in-modal error, not a silent failure or a crash.

**Decision made 2026-07-11 (Sharifur, via AskUserQuestion)**: multi-provider — `LLM_PROVIDER` env var selects `openai` | `deepseek`, not a single hardcoded provider.

**Unblocked 2026-07-12**: `OpenAiCompatibleProvider` — one shared implementation for both, since DeepSeek's API is a drop-in-compatible superset of OpenAI's chat completions endpoint (same request/response shape, different base URL/model/key). `AiAssistService.getProvider()` reads `LLM_PROVIDER` and instantiates the right one; an unrecognized value throws rather than silently falling back to a default. Neither provider fakes a response when its key is missing — same "throw a clear, actionable error" pattern as every other unconfigured integration this session (SES, R2, Gmail, Reoon/NeverBounce, Slack).

Confirmed the "doesn't bypass the spintax/personalization-token system" criterion is satisfied by the existing architecture, not new code: `resolvePersonalization()`/`resolveSpintax()` both operate via regex/parsing on the *rendered text string* (`template.subject`/`bodyHtml`/`bodyText`), not on TipTap's structured node tree — so AI-generated plain text inserted via `editor.chain().insertContent(text)` resolves at send time exactly the same as if a human had typed `{{contact.firstName}}` or `{option A|option B}` by hand. No special-casing needed.

Verified live: the modal renders pixel-for-pixel matching the design (prompt textarea, quick-action chips correctly disabled until a result exists, "AI-generated · review before sending" footer). Attempting to generate with no API key configured surfaces the exact clean "OpenAI is not configured — no API key set" error inline in the modal — not a crash, not a silent failure, directly satisfying the ticket's third acceptance criterion. 5 Jest tests cover: clean error when unconfigured, rejects an unrecognized `LLM_PROVIDER` value rather than silently defaulting, calls the real OpenAI endpoint with the exact prompt when configured, routes to the real DeepSeek endpoint (different base URL/model) when `LLM_PROVIDER=deepseek`, and a quick action correctly wraps the *previous result* (not the original prompt) with a refinement instruction. **Sharifur: once a real `OPENAI_API_KEY` or `DEEPSEEK_API_KEY` is in `.env`, this should generate real copy as-is — worth a live pass to sanity-check output quality/tone, which obviously couldn't be evaluated without a real key.**

### GC-060 — Email log UI
All-sends log (not the aggregate dashboard from GC-058 — this is the raw per-send list): status, recipient, template, timestamp, filterable, with a detail drawer showing the specific resolved subject/body and event history for one send. Design: `EMAIL LOG`, `EMAIL LOG DETAIL DRAWER`.
**Acceptance criteria:**
- Every row is backed by a real `Send` row — clicking into the detail drawer shows the actual resolved (post-spintax) subject/body stored on that row, not the live template.

**Blocked 2026-07-11**: depends on GC-019/GC-020 (blocked) — no `Send` rows exist yet.
- Filterable by at least status (sent/opened/clicked/bounced) and by campaign/sequence.

**Unblocked 2026-07-12**: `EmailLogService`/`EmailLogController` (`GET /email-log?status=&campaignId=&sequenceId=`, `GET /email-log/:id` for the detail drawer). `EmailLog.tsx` — status filter chips, a client-side recipient/subject search, and the design's slide-in detail drawer (fields, real resolved HTML body, real delivery timeline from `email_events`). Design's drawer also shows "Suppress"/"Resend email" action buttons — omitted both since neither is backed by a real endpoint (no manual-suppress-from-log endpoint exists, no resend feature was ever specced anywhere) rather than ship non-functional buttons.

Verified live via Playwright: the log correctly shows 24 real send rows accumulated from this session's testing, with real per-recipient spintax-resolved subjects visible in the list ("Hi Contact5", "Hey Contact3", etc. — genuinely different variants, not the same text repeated). Opened the detail drawer on a real failed send — every field was real (recipient, resolved subject, provider, the exact SES-not-configured error) and "Delivery timeline: No events yet" correctly reflected that this particular send never got an open/click. Directly proves the ticket's own acceptance criterion with a real-DB Jest test: inserted a send, then *mutated the source template's subject afterward*, and asserted the detail drawer's `resolvedSubject` still shows the original send-time value, not the now-different live template — the exact "not the live template" check the ticket asks for.

### GC-061 — Wrap guarded-write + audit-log calls in a DB transaction
Found 2026-07-12 while live-testing GC-021b: every RBAC-guarded write endpoint (`templates`, `sequences`, `lists`, `enrollments`, `campaigns`, `triggers`) does its primary write, then calls `AuditLogService.record()` as a separate, un-transacted statement. If the audit-log insert fails for any reason (observed cause: a stale JWT referencing a `users` row that no longer exists, tripping `audit_log_actor_id_users_id_fk`), the client gets a 500 and reasonably assumes nothing happened — but the primary row already committed. Not data-lossy (nothing needed the orphaned row to exist), but it's a real "the API lied about failing" gap.
**Acceptance criteria:**
- Every controller that calls both a service write method and `AuditLogService.record()` does both inside one Drizzle transaction (`db.transaction(...)`), so a failed audit-log write rolls back the primary write too.
- A forced audit-log failure (e.g. a bad `actor_id`) in a test leaves zero trace of the primary write — no orphaned row.

TODO — not started. Low urgency (no data-loss risk observed, just a misleading error response), grouped with GC-057 since it's audit-log's own transactional boundary.

### GC-062 — Verification dashboard UI
Found 2026-07-12 while building GC-049: the design's `VERIFICATION` screen (bulk-verify button, per-status stat cards with counts/bars, verification-credits-remaining balance) isn't covered by any ticket — GC-049's own acceptance criteria are backend-only (caching + fallback behavior), and no other ticket claims this screen. Split out rather than built silently under GC-049.
**Acceptance criteria:**
- Shows real per-status contact counts (valid/invalid/risky/unverified), computed from `verification_results` joined against `contacts`, not placeholder numbers.
- "Bulk verify" enqueues a real job that calls `EmailVerificationService.verify()` for every unverified contact (BullMQ, invariant 10 — not a blocking request-cycle loop over potentially thousands of contacts).
- Credits-remaining display can be a static "not tracked yet" state if neither Reoon nor NeverBounce exposes a balance-check endpoint cheaply — don't fake a number.

TODO — not started. Depends on GC-049 (done) for the underlying verification calls; needs real Reoon/NeverBounce keys for the bulk-verify button to do anything beyond a clean "not configured" state.

### GC-063 — Add JwtAuthGuard+RolesGuard to TagsController
Found 2026-07-12 while building the Lists & Tags UI: `TagsController` (`/tags` — create/update/delete/add-contact/remove-contact) has no `@UseGuards()` at all, unlike every other write-capable controller in the app (`ListsController`, `TemplatesController`, `SequencesController`, `CampaignsController`, `TriggersController`, etc. all have `JwtAuthGuard`+`RolesGuard`). Anyone who can reach the API can create/delete tags and tag/untag any contact with no authentication — a real gap, not a stylistic inconsistency. Not fixed inline while building the UI, since invariant 11 is explicit that guard-coverage changes should be their own deliberate, ticketed decision, not a silent side effect of an unrelated UI ticket.
**Acceptance criteria:**
- `TagsController` requires authentication for every route (matches `ListsController`'s exact guard/role pattern: reads need any authenticated role, writes need `owner`/`editor`).
- A viewer-role token gets 403 on tag create/delete/add-contact/remove-contact; an unauthenticated request gets 401 on everything.

TODO — not started. Low effort, clear fix; flagged rather than silently patched per invariant 11.

---

## Full UI-vs-design cross-check pass (2026-07-12)

Requested explicitly by Sharifur mid-session: "ensure all the ui is properly implemented as per given design, by cross checking it." Did a systematic screen-by-screen comparison — every `<!-- ==== SCREEN ==== -->` marker in `docs/design/geniusCampaign.dc.html` against every route actually built in `apps/web/src/routes/`.

**Already covered correctly** (verified against the design earlier in their own tickets, no changes needed): Dashboard, Contacts, Contact Detail, Templates, Template Editor, Sequences List, Sequence Builder, Email Log + detail drawer, Campaigns List, Campaign Compose, Campaign Detail, Sender Accounts, CSV Import modal, Spintax Edit modal, AI Assist modal, Enroll modal.

**Real gaps found and fixed this pass** — four screens the design specifies that had real, ready backends but zero frontend, making those features only reachable via raw API calls (inconsistent with the "no direct API calls needed" standard every other screen this session was held to):
- **Lists & Tags** (`/lists`) — folded into GC-011's entry above.
- **Triggers + New Trigger modal** (`/triggers`) — folded into GC-035's entry above.
- **Webhooks** (`/webhooks`) — folded into GC-043's entry above.
- **Settings** (`/settings`, Members/Audit log/Suppression list tabs) — folded into GC-057's entry above.

**One real backend gap found while building these** — filed as GC-063 above (`TagsController` missing auth guards entirely).

**Known, previously-documented scope trims that remain as-is** (not re-litigated this pass, already flagged in their own ticket entries): GC-047's hourly-cap/signature UI, GC-058's "sending health" composite score, GC-060's Suppress/Resend drawer buttons, GC-062's verification dashboard (still fully TODO). All Chrome-based UI verification this session (including every screen touched in this pass) used the Playwright fallback per `CLAUDE.md`'s stated fallback path — the Chrome browser-automation extension was disconnected for the entire session; a human pass with real Chrome is still worth doing per that same fallback note.

### Follow-up: Login screen (2026-07-12)
Sharifur flagged "no login page shown" and pointed at a fresh design export (`~/Downloads/geniuscampaign-admin-panel-design/`) that turned out to be the same bundle plus one addition: a full `LOGIN` section that the repo's `docs/design/geniusCampaign.dc.html` never had (it previously jumped straight to the app shell). Copied the updated file into the repo — every other screen in it is unchanged from before.

Rebuilt `Login.tsx` from scratch to match: split-screen layout (email/password form left, branded gradient panel right), real work-email/password fields wired to the existing `/auth/login` + `/auth/register` endpoints, a visually-present but disabled "Continue with Google Workspace" button (this app's Google OAuth is for *sending* mailboxes — GC-044 — not admin login SSO, which was never built; shown per the design but honestly inert rather than faked). The right panel's three stat numbers (`sent/30d`, `open rate`, `contacts`) are real, not the design's hardcoded `48.9k/49.6%/18.2k` — added a new unauthenticated `GET /analytics/public/summary` endpoint (aggregate counts only, no PII, safe pre-login) rather than fabricate the same kind of placeholder number this session has avoided everywhere else. Dropped the design's "All systems healthy · 92/100" pill entirely — no ticket computes a composite health score (same reasoning as GC-058's dashboard).

**Real bug found and fixed while rebuilding this**: `tailwind.config.ts` has no spacing-scale extension, so fractional utility classes like `mb-4.5`/`gap-6.5`/`h-8.5` are invalid and silently no-op in this project (Tailwind's default scale only includes `0.5/1.5/2.5/3.5`, nothing above). A sweep of every file touched in the cross-check pass above (`ListsAndTags.tsx`, `Triggers.tsx`, `Webhooks.tsx`, `Settings.tsx`, `NewTriggerModal.tsx`, `AiAssistModal.tsx`) plus the new `Login.tsx` found the same mistake repeated ~30 times, silently collapsing intended spacing to zero in several places (most visible on this login page's stat row, which is why it looked broken). Fixed every occurrence to exact arbitrary pixel values (`gap-[26px]` etc.); documented as a standing convention note in `CLAUDE.md` so it isn't repeated.

Verified live via Playwright: login page renders pixel-matching the design (branding, spacing, real stat numbers), full submit → real JWT → redirect flow works end-to-end with zero console errors.

### GC-064 — Forgot/reset password flow (2026-07-12)
Sharifur then asked to remove the (honestly-inert) Google Workspace button and add a real "Forgot password" option instead. Confirmed the approach first: build the real flow, blocked on SES the same way every other email-sending feature is, rather than a UI-only stub or an owner-driven-reset-only fallback.

New `password_reset_tokens` table (userId, `tokenHash` — SHA-256 of the real token, the raw value only ever exists in the emailed link, never stored, same principle as password hashing itself — expiresAt 1 hour, usedAt). New `PasswordResetModule` (deliberately separate from `AuthModule` — importing `SendingModule` there directly would create a circular module dependency, since `SendingModule` already imports `AuthModule` for guards) with two public endpoints: `POST /auth/forgot-password` always resolves the same way whether or not the email exists (never lets a caller enumerate accounts — the real token+email work only happens if a user is actually found), `POST /auth/reset-password` validates an unexpired, unused, hash-matched token before setting a new password via `bcrypt`. The reset email itself goes through the one shared `SendDispatcherService` (invariant 7) rather than a parallel transactional-mail pathway — `unsubscribeUrl` doesn't really apply to a password-reset email, so it's set to the app URL as a harmless placeholder rather than inventing a second sending path.

Frontend: `ForgotPassword.tsx` + `ResetPassword.tsx` (reads `?token=` from the URL), both public routes outside `ProtectedRoute`. `Login.tsx`'s Password label now has a real `Forgot?` link (the design always had one; the initial rebuild dropped it since nothing backed it yet).

Verified live end-to-end, including the parts that can't be exercised through the browser alone: (1) requesting a reset for an unknown email resolves as generic success with zero token rows created; (2) requesting a reset for a real user creates a real token row, then correctly fails with the same clean SES-not-configured error every other send hits — proving the token creation and the send attempt are genuinely separate steps, not faked together; (3) manually inserted a real valid token (matching the service's own SHA-256 scheme) and drove the actual `/reset-password` page through a real browser session — new password set, and confirmed with a real `/auth/login` call that it actually works. 5 real-DB Jest tests (unknown email, known email decoupled from send failure, invalid token, valid-token-then-reused-fails, expired token) — caught and fixed one test-isolation bug of my own along the way (an unscoped table-wide count assertion that broke once manual live-testing had left rows in the table; scoped it to the test's own user).

### Follow-up: remove register, add remember-me + local demo credentials (2026-07-12)
Two more direct requests after the above. First: remove the "First time? Create an account" toggle from `Login.tsx` entirely — it's now always just the sign-in form. This does narrow how a brand-new install gets its first account: `POST /auth/register` still exists and still works exactly as before (first-ever registration becomes `owner`, per invariant 11) — it's just no longer reachable from the UI. **Bootstrapping a fresh install's first owner account now requires one direct API call** (`curl -X POST .../auth/register -d '{"email":...,"password":...}'`) rather than a UI flow; flagging this rather than leaving it implicit, since it's a real operational step someone will eventually need to know about.

Second: "Remember me for 14 days" — `LoginDto` gets an optional `rememberMe` boolean; `AuthService.login()` signs the JWT with a 14-day expiry when set, otherwise falls through to `JwtModule`'s existing 7-day default (remember-me only ever extends, never shortens). Real checkbox added to `Login.tsx`, wired through `authApi.login()`. Proven with 2 Jest tests that actually decode the issued JWT and check `exp - iat` in days, not just that a flag was passed somewhere — one confirms the unchecked case is still ~7 days, the other confirms checked is ~14. Also confirmed live in a real browser session: logged in with the checkbox checked, pulled the real token out of `localStorage`, decoded it, and it really is a 14-day token.

Third: "if it's in local then always show demo credentials on the login page" — a small box gated by `import.meta.env.DEV` (Vite's dev-only flag, stripped from any real production build) showing the working test account (`trigger-test@example.com` / `Test1234!`) with a clearly-labeled "Local dev only" heading. Not a new mechanism — just surfacing the same seeded test account used throughout this session's own live verification.

### GC-065 — App shell: sidebar + top bar rebuild (2026-07-12)
Sharifur flagged that the sidebar and dashboard didn't match the design. `Layout.tsx` turned out to still be Sprint 0's placeholder scaffold (GC-006) — a flat unstyled link list — never upgraded when the rest of the UI was built against `docs/design/geniusCampaign.dc.html`, even though the design reference map had already flagged this exact gap ("implement the shell once, early in Sprint 1's UI work, rather than per-screen").

Rebuilt to match: icon nav grouped into Audience/Content/Delivery/Infrastructure sections, active-route highlighting, a real contact-count badge (reuses the public analytics summary endpoint), a real sender-quota warn dot (computed from actual `sentToday`/`dailySendLimit` on active sender accounts, not decorative), and a real user-identity footer (email/role from the auth store — there's no `name` field on `users`, so avatar initials come from the email rather than inventing a display name like the design's "Dana Kessler").

Dropped from the design rather than faked: the notification bell (no backend notification system exists anywhere in this app — the design's own code comment marks that data as "example payloads for the backend team," i.e. a spec, not literal content), the global ⌘K search box (no search endpoint), and the composite health-score pill (same reasoning already applied to the dashboard and login page). The "New" button is a real dropdown to the actual create routes, not decorative. Dashboard header got a static "Last 30 days" pill for closer visual parity — not a real dropdown, since only a fixed 30-day window is supported server-side.

Verified live via Playwright: nav grouping/icons/badges render correctly, active-state highlighting works when navigating, the "New" dropdown opens and links to the right routes.

### GC-066 — Contacts list: rebuild to match design (2026-07-12)
Same visual cross-check, this time on Contacts. The existing list (from GC-021) only had a 3-column table (name/status/created) with a single search+filter toolbar — the design specifies checkboxes with a bulk-action bar (Add to list / Enroll / Verify / Suppress), Tags and Lists columns, a Last activity column, sortable headers, a real empty state, and a pagination footer. All of that was genuinely missing, not a styling gap — closing it needed new backend query work, not just JSX.

**Backend**: `ContactsService.findAll()` now joins in tags, lists, verification status, and last activity (max of any send's `sentAt` or any of its `email_events.createdAt`) per contact in a few grouped queries, rather than the single flat `contacts` select it was doing before. New `POST /suppression-list/manual` endpoint (contactId body) — added to the existing `SuppressionController` since it already carries `JwtAuthGuard` — calls the real `SuppressionService.suppress()` (so it actually lands in `suppression_list`, what `SendDispatcherService` really checks per invariant 8) and mirrors `contacts.status` to `suppressed` so the list's own filter chips/badges stay consistent. `SuppressionModule` now imports `ContactsModule` for this (checked first for a cycle — `ContactsModule` doesn't import `SuppressionModule` back, so it's safe).

**One deliberate deviation from the design**: the design's "Status" column/badge (verified/risky/unverified/invalid/pending) is actually about *verification* state, while this app's real `contacts.status` field (active/unsubscribed/bounced/suppressed) is about send-eligibility — two different concepts that the design's mock data conflates into one column. Kept the Status column showing the real, already-wired `contacts.status` (matches the existing filter chips) rather than relabeling it to a verification concept that's mostly empty until Sharifur provides a real Reoon/NeverBounce key. The header's "N verified" count is real too — it reads `verificationResults` (populated only by the paid check), so it honestly shows 0 until that's configured.

**Bulk "Verify" is intentionally wired to the free local check** (`POST /verification/local-check` — syntax/MX/disposable-domain only), never the paid `POST /verification/check`, per CLAUDE.md's hard-stop on calling paid verification APIs without a real key. The result banner says so explicitly ("not a paid deliverability verification") rather than implying real verification happened. Bulk Enroll reuses the existing `POST /admin/sequences/:id/enroll` per contact; Add-to-list reuses the existing per-contact list endpoint; pagination is client-side (25/page) since the backend still returns the full contact set unpaged — fine at this app's current scale, flagged here in case contact volume grows enough to need real server-side pagination later.

Verified live: enriched `GET /contacts` response confirmed via curl (real tags/lists/lastActivityAt). Ran the actual bulk actions end-to-end through a real browser session, not just visually — selected a real test contact, ran bulk Verify (got a real "1 of 1 passed" result), then ran bulk Suppress and confirmed via a second curl that it created a real `suppression_list` row (`reason: manual_unsubscribe, source: admin_ui`) and flipped `contacts.status` to `suppressed`, with the header/filter counts updating live in the screenshot. Restored the test contact back to `active` afterward (same test-hygiene practice as GC-064's password restore). Backend: 71/71 Jest passing, `tsc --noEmit` clean on both apps.
