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
| GC-061 | Wrap guarded-write + audit-log calls in a DB transaction | 4 | S | Done | GC-057 |
| GC-062 | Verification dashboard UI (bulk verify, stats, credits) | 4 | M | Done | GC-049 |
| GC-063 | Add JwtAuthGuard+RolesGuard to TagsController | 4 | S | Done | GC-056 |
| GC-064 | Forgot/reset password flow | 4 | M | Code done, needs Sharifur's AWS SES creds for the actual reset email | GC-011 (auth) |
| GC-065 | App shell: sidebar + top bar rebuild to match design | 4 | M | Done | GC-006 |
| GC-066 | Contacts list: rebuild to match design (bulk actions, tags/lists/last-activity columns, sort, pagination) | 4 | L | Done | GC-021, GC-011, GC-035, GC-049 |
| GC-067 | Contacts page: per-contact verify icon (click-to-verify) | 4 | S | Done | GC-049, GC-066 |
| GC-068 | Template editor: save shuffle/AI variants as their own hidden template, selectable in campaign compose | 4 | M | Done | GC-016, GC-054, GC-059 (AI Assist reuse), GC-020 |
| GC-069 | Campaigns list + detail: rebuild to match design (Sent/Open/Click columns, delivered/opens/clicks/bounces stats, engagement funnel, ratio stats, recipient tabs) | 4 | M | Done | GC-020, GC-021b, GC-019 |
| GC-070 | Campaign compose: tag-based and individual-recipient audience modes | 4 | M | Done | GC-011, GC-021b |
| GC-071 | Settings > Integrations: manage AWS/R2/AI/verification/Google/Slack/tracking credentials from the UI | 4 | L | Done | GC-056, GC-057 |
| GC-072 | Fix: contact tag pill background color not reflecting stored `tags.color` | 4 | S | Done | GC-066 |
| GC-073 | Campaign detail recipient rows: match Contacts page (avatar, name, link to contact detail) | 4 | S | Done | GC-069, GC-066 |
| GC-074 | Sequences list + builder: rebuild to match design (Enrolled/Open/Status columns, grouped delay+send step blocks, variant chips, Enrolled contacts tab) | 4 | L | Done | GC-030, GC-031, GC-033, GC-042, GC-068 |
| GC-075 | Trigger detail page: fired-events history + stats | 4 | M | Done | GC-035, GC-036, GC-037 |
| GC-076 | Webhook-based trigger type (reuses HMAC inbound webhook framework) | 4 | M | Done | GC-035, GC-037, GC-040 |
| GC-077 | Sender Accounts: multiple named AWS SES accounts with per-account credentials | 4 | M | Done | GC-047, GC-071 |
| GC-078 | Sequences/Triggers: replace Unicode-glyph icons with real SVG icons | 4 | S | Done | GC-074, GC-075 |
| GC-079 | Site chrome: per-route document title, footer, top-bar user dropdown (Profile + Change Password) | 4 | M | Done | GC-011 (auth), GC-065 |
| GC-080 | Settings > Integrations: remove AWS/Gmail/Slack categories (redundant/unwanted), sub-tab the rest; Profile page: editable name + email | 4 | M | Done | GC-071, GC-077, GC-079 |
| GC-081 | AI-assisted copy settings: configurable model per provider, Provider/Model rendered as real selects | 4 | S | Done | GC-059, GC-080 |
| GC-082 | Members: owner-only "Add member" (email + role + admin-set password, no email invite) | 4 | M | Done | GC-011 (auth) |
| GC-083 | Audit log: server-side pagination | 4 | S | Done | GC-061 |
| GC-084 | Suppression list: server-side pagination | 4 | S | Done | GC-018 |
| GC-085 | Email log: server-side pagination | 4 | S | Done | GC-023 (email log) |
| GC-086 | Top-bar dropdown: show name instead of email when set | 4 | S | Done | GC-079, GC-080 |
| GC-087 | Settings: setup-instructions tooltip for Email verification + Cloudflare R2 categories | 4 | S | Done | GC-071, GC-080 |
| GC-088 | Verification bulk-verify: real-time progress polling every 10s | 4 | S | Done | GC-062 |
| GC-089 | AI-assisted copy: refresh model option lists to current OpenAI/DeepSeek models (web search) | 4 | S | Done | GC-081 |
| GC-090 | AI settings: hide the inactive provider's API key field | 4 | S | Done | GC-081 |
| GC-091 | Favicon: replace with the real in-app logo mark (paper-plane on gradient) | 4 | S | Done | GC-079 |
| GC-092 | Public `/about` page promoting geniusCampaign as free/open-source, by xgenious.com | 4 | M | Done | GC-079 |
| GC-093 | Add member modal: optional name field | 4 | S | Done | GC-082 |
| GC-094 | Sidebar/login logo tagline: "Internal outreach platform" → "by xgenious.com" | 4 | S | Done | GC-065 |
| GC-095 | Members list: show name alongside email (not email only) | 4 | S | Done | GC-093 |
| GC-096 | Prevent a user from changing their own role (self-demotion/lockout guard) | 4 | S | Done | GC-011 (auth) |
| GC-097 | CSV import rebuild: arbitrary column mapping, real-time progress, invalid/duplicate counts, list/tag pick-or-create | 4 | L | Done | GC-012 |
| GC-098 | "by xgenious.com" tagline: link to https://xgenious.com, new tab | 4 | S | Done | GC-094 |
| GC-099 | Settings notice box: fix to green success styling | 4 | S | Done | GC-080 |
| GC-100 | Debug log: capture unexpected frontend/backend errors, new Settings tab | 4 | M | Done | GC-071 |
| GC-101 | Contacts bulk delete option | 4 | S | Done | GC-021 |
| GC-102 | Verify icon: fix Reoon status-mapping bug, add spinner + toast feedback | 4 | M | Done | GC-025 (verification) |
| GC-103 | Verify status icons: distinct shape per status (not color-only), icon+tooltip in toast | 4 | S | Done | GC-102 |
| GC-104 | Bulk-verify: add safety `limit` param, fix missing live progress bar in Verification UI | 4 | S | Done | GC-062 |
| GC-105 | Template editor toolbar: underline, strike, headings, align, bullet/numbered list, blockquote, divider, undo/redo, CTA button | 4 | M | Done | GC-015 |
| GC-106 | Prebuilt email template library (6 starters, imported from Claude Design "Email Library" project) + replace window.prompt with in-app dialogs | 4 | M | Done | GC-105 |
| GC-107 | Template editor: preview across email clients + responsive, send a real test email | 4 | M | Done | GC-062 (send pipeline) |

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

**Done (2026-07-12).** `db/types.ts` adds a shared `DbOrTx` type (`NodePgDatabase | NodePgTransaction`, both schema-typed). Every write method on `TagsService`, `ListsService`, `TemplatesService`, `SequencesService`, `CampaignsService.create`, `EnrollmentService`, and `CircuitBreakerService.reset` now takes an optional trailing `db: DbOrTx = this.drizzle.db` and uses it in place of `this.drizzle.db` — default value means every existing caller (including `EnrollmentService`'s other caller, GC-041's public webhook controller, per invariant 2) behaves exactly as before. `AuditLogService.record()` grew the same optional trailing `db` param. Each of the 6 controllers (`TagsController`, `ListsController`, `TemplatesController`, `SequencesController`, `CampaignsController.create` only, `AdminEnrollmentController`, `CircuitBreakerController`) now wraps its write-then-audit call site in `this.drizzle.db.transaction(async (tx) => {...})`, passing `tx` to both calls. `TemplatesService.create/update` already opened their own internal transaction for the template+version-history atomicity — changed to `db.transaction(...)` so a controller-supplied `tx` becomes a nested savepoint rather than double-transacting.

**Deliberately left out of the transaction wrap**: `CampaignsController.send()` — its DB write (the optional `largeSendConfirmed` flag) and its `queue.add()` BullMQ enqueue are two different systems; a Postgres transaction can't roll back a Redis job, so wrapping only the DB half in a transaction with the audit record wouldn't actually buy the same guarantee this ticket is about. `create()` (a real, atomic DB insert) got the fix; `send()`'s audit call remains a separate statement after the queue enqueue, same as before.

Proven, not just asserted: `auth/audit-log-transaction.spec.ts` (real DB) calls `tagsService.create()` + `auditLog.record()` inside one `db.transaction()` with a bogus `actor.id` (no matching `users` row, the exact failure mode that surfaced this ticket) — asserts the transaction rejects *and* that the tag row was never actually left behind. Full suite: 72/72 passing (was 71 before this ticket's new test). Also manually verified via curl: unauthenticated `POST /tags` → 401 (proves GC-063 didn't regress), authenticated `POST /tags` → 201 with both the tag and its audit-log row committed together.

### GC-062 — Verification dashboard UI
Found 2026-07-12 while building GC-049: the design's `VERIFICATION` screen (bulk-verify button, per-status stat cards with counts/bars, verification-credits-remaining balance) isn't covered by any ticket — GC-049's own acceptance criteria are backend-only (caching + fallback behavior), and no other ticket claims this screen. Split out rather than built silently under GC-049.
**Acceptance criteria:**
- Shows real per-status contact counts (valid/invalid/risky/unverified), computed from `verification_results` joined against `contacts`, not placeholder numbers.
- "Bulk verify" enqueues a real job that calls `EmailVerificationService.verify()` for every unverified contact (BullMQ, invariant 10 — not a blocking request-cycle loop over potentially thousands of contacts).
- Credits-remaining display can be a static "not tracked yet" state if neither Reoon nor NeverBounce exposes a balance-check endpoint cheaply — don't fake a number.

**Done (2026-07-12).** New `VerificationStatsService.getStats()` computes real valid/invalid/risky/unverified counts by joining `verification_results` (non-expired rows only, per GC-049's 6-month TTL — an expired result counts as unverified again) against `contacts`; `unverified` is `total - valid - invalid - risky` rather than a separate query, so the four numbers always sum to the real contact count. New `bulk-verify` BullMQ queue + `BulkVerifyProcessor`: `GET /verification/stats`, `POST /verification/bulk-verify` (enqueues, returns `jobId` — invariant 10, never a blocking loop), `GET /verification/bulk-verify/:jobId` (status poll, mirrors GC-012's CSV-import job-status pattern). `VerificationStatsService.listUnverifiedActiveContacts()` scopes the job to `status = 'active'` contacts only (no point spending API calls on contacts that would never be sent to anyway) with no current non-expired result. Frontend: new `/verification` route + sidebar nav item (Audience group, next to Contacts/Lists & Tags), 4 stat cards with a percentage bar each, "Bulk verify · N pending" button that polls job status and shows the real completion summary (checked/failed counts, real error text) — same polling pattern as `CsvImportModal`. Credits card is a static "Not tracked" state with an honest explanation, never a fabricated number, per this ticket's own acceptance criteria.

**One real limitation surfaced, not a bug introduced here**: `EmailVerificationService.verify()` returns early on a local-syntax/MX/disposable-domain rejection (GC-048) *without* writing to `verification_results` — that cache table is reserved for paid-API-confirmed outcomes. So a bulk-verify run's "checked" count can include contacts the local pre-filter caught for free, but those don't move the stats grid's `invalid` bucket (they were never anything but "unverified" from the stats endpoint's point of view). Flagging rather than quietly changing GC-048/049's existing cache-writing behavior to fix a display nuance in this ticket.

Verified live in Chrome: real stats (70 unverified, matching real contact count), clicked "Bulk verify," watched it complete and report "checked 19 of 59, 40 failed (NEVERBOUNCE_API_KEY is not configured — cannot call NeverBounce for real.)" — proves the full pipeline runs for real (local pre-filter → cache check → Reoon attempt → NeverBounce fallback → clean per-contact failure, collected into one job result) without needing real keys or incurring any cost. Backend: 72/72 Jest passing, `tsc --noEmit` clean on both apps.

### GC-063 — Add JwtAuthGuard+RolesGuard to TagsController
Found 2026-07-12 while building the Lists & Tags UI: `TagsController` (`/tags` — create/update/delete/add-contact/remove-contact) has no `@UseGuards()` at all, unlike every other write-capable controller in the app (`ListsController`, `TemplatesController`, `SequencesController`, `CampaignsController`, `TriggersController`, etc. all have `JwtAuthGuard`+`RolesGuard`). Anyone who can reach the API can create/delete tags and tag/untag any contact with no authentication — a real gap, not a stylistic inconsistency. Not fixed inline while building the UI, since invariant 11 is explicit that guard-coverage changes should be their own deliberate, ticketed decision, not a silent side effect of an unrelated UI ticket.
**Acceptance criteria:**
- `TagsController` requires authentication for every route (matches `ListsController`'s exact guard/role pattern: reads need any authenticated role, writes need `owner`/`editor`).
- A viewer-role token gets 403 on tag create/delete/add-contact/remove-contact; an unauthenticated request gets 401 on everything.

**Done (2026-07-12).** `TagsController` now carries `@UseGuards(JwtAuthGuard, RolesGuard)` at the class level with `@Roles('owner', 'editor')` on create/update/delete/addContact/removeContact — an exact mirror of `ListsController`. Bundled with GC-061's transaction wrap since it touched the same controller anyway.

Verified live: `curl -X POST localhost:3001/tags` with no `Authorization` header → `401`; the same request with a real owner JWT → `201`, and the tag actually exists in the DB afterward (proving the new transaction wrap from GC-061 didn't silently swallow the write).

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

### GC-067 — Contacts page: per-contact verify icon (2026-07-12)
Sharifur asked for a per-row verified/unverified icon in Contacts (colored if verified, gray otherwise) that runs verification for that email on click — a lighter-weight, single-contact complement to GC-062's still-TODO full verification dashboard.

Small checkmark-circle icon added inline in the Contact cell next to each row's name/email, reusing the same icon already used for the "Verify" actions elsewhere for visual consistency. Green (`text-success`) when `contact.verificationStatus === 'valid'`, gray/muted otherwise (covers `invalid`/`risky`/`unknown`/never-checked — all read as "not confirmed deliverable" for this simple binary indicator). Click calls a new `verifyEmail()` (`POST /verification/check`) — **the real paid Reoon/NeverBounce endpoint**, deliberately one-at-a-time per explicit user click rather than wired into any bulk/automatic path. This is safe under CLAUDE.md's hard-stop because the endpoint fails cleanly before any network call goes out when no real `REOON_API_KEY`/`NEVERBOUNCE_API_KEY` is configured — no cost is ever incurred, verified live (see below). On success the row's `verificationStatus` updates locally without a full reload; on failure the real error message surfaces in the existing notice banner rather than being swallowed.

Verified live in Chrome: clicked the icon on a real contact row, got back the actual server error verbatim ("NEVERBOUNCE_API_KEY is not configured — cannot call NeverBounce for real", after Reoon failed the same way first) in the notice banner — confirms the real code path runs end-to-end (local pre-filter → cache miss → Reoon attempt → NeverBounce fallback → clean failure) and that it is honestly blocked on missing keys rather than faked. `tsc --noEmit` clean on `apps/web`.

### GC-068 — Save shuffle/AI template variants (2026-07-12)
Sharifur asked for Shuffle (GC-054) to produce real, independently-usable variants — each with its own subject+body, saved as its own template but excluded from the main Templates list (it's a variant, not an independent template), and selectable when composing a campaign. Also asked for an AI icon to generate a variant "following existing template content."

**Schema**: `templates.parentTemplateId` (nullable, self-referencing, `onDelete: cascade` — a deleted parent takes its variants with it). A variant is a completely normal `templates` row otherwise — same `template_versions` history, same uses/open-rate stats, real FK target for `sends.templateId` — just flagged by having a parent.

**Backend**: `TemplatesService.findAll(includeVariants = false)` filters to `parentTemplateId IS NULL` by default (satisfies "won't show in the list"); `GET /templates?includeVariants=true` returns everything for the campaign-compose picker. New `GET /templates/:id/variants` for fetching one parent's variants directly. `CreateTemplateDto` takes an optional `parentTemplateId`. No changes needed anywhere in the actual send path — a variant is just another template id, `CampaignsService`/`SendDispatcherService` don't know or care that it has a parent.

**Frontend**: `SpintaxShufflePreview` — each of the 3 shuffled cards gets a "Save as variant" button (disabled until the parent template itself has been saved, i.e. has a real id) that POSTs the resolved subject + a minimal one-paragraph-per-line ProseMirror doc as a new template with `parentTemplateId` set. A new ✦ icon next to Shuffle calls the **existing** `POST /ai-assist/generate` (GC-059's already-built endpoint — no new LLM integration, no new key decision) with a prompt embedding the template's real current subject/body and asking for one alternate variant in a `SUBJECT:`/`BODY:` format, parsed back into the same two fields and rendered as a 4th card with its own "Save as variant" button. Like every other AI-Assist call, this fails cleanly (real error surfaced) without a real `OPENAI_API_KEY`/`DEEPSEEK_API_KEY` — never mocked. `CampaignCompose`'s template `<select>` now renders `<optgroup>`s per top-level template with variants nested under their parent (`↳ Name`); `CampaignsList`/`CampaignDetail`'s template-name lookups switched to `includeVariants=true` too, so a campaign sent against a variant still resolves its name correctly instead of showing "—".

Verified live: shuffled "Campaign spintax template," saved Variant 1 as its own template, confirmed via `psql` it exists as a real row with `parent_template_id` set to the parent's id; confirmed it does **not** appear on `/templates`; confirmed via DOM inspection of the campaign-compose `<select>` that it renders nested (`↳ Campaign spintax template — Variant 1`) under its parent's `<optgroup>`. `tsc --noEmit` clean on both apps.

### GC-069 — Campaigns list + detail: rebuild to match design (2026-07-12)
Cross-checked `CampaignsList`/`CampaignDetail` against the design's `CAMPAIGNS`/`CAMPAIGN DETAIL` screens — real gaps, not styling nits. The list showed Sent/Failed/Suppressed columns (this app's own send-outcome counters); the design specifies Sent/Open/Click. The detail screen showed only 3 cards (Sent/Failed/Suppressed) with no percentages, no engagement funnel, no ratio stats, and a flat unfiltered recipient list — the design has 4 stat cards with pct sub-labels (Delivered/Opens/Clicks/Bounces), a bar-chart engagement funnel, a 4-up ratio-stats grid (open/click/click-to-open/bounce rate), and a tabbed (All/Opened/Clicked/Bounced) recipient list with avatar-initial rows.

**Backend**: `CampaignsService.findAll()` now joins `sends`/`email_events` per campaign the same way `TemplatesService.findAll()` already computes uses/open-rate — adds real `openCount`/`clickCount` to each campaign row, not stored (can't drift). `CampaignsService.getSends()` now also joins `email_events` per send and returns `opened`/`clicked` booleans per send, so the detail screen's stat cards, funnel, ratios, and recipient tabs/filtering are all derived from the same real per-send data — no separate "recompute" logic that could disagree with the counters.

**Frontend**: `CampaignsList` table is now Campaign/Sent/Open/Click/Status with a `{list name} · {date}` subtitle (matches the design's `{{c.list}} · {{c.date}}`, dropping the template-name half of the old subtitle since the design doesn't show it there). `CampaignDetail` rebuilt with the 4 stat cards + pct, engagement funnel (3 bars: Delivered/Opened/Clicked, each pct of delivered), ratio stats grid, and a tabbed recipient list matching each tab's real count. Subtitle line approximates the design's "Sent {date} · {template} · {N} recipients · via {sender}" — used the real dominant `sends.provider` (SES/Gmail) for the "via" part rather than fabricating a sending-domain string neither the schema nor any config value actually provides.

**Deliberately not touched**: `CampaignCompose`'s audience picker is List-only; the design also shows Tag-based and individual-recipient audience modes, which would need real schema/send-logic changes (campaigns currently only have one `listId`, not a tag filter or an ad-hoc recipient set) — split out as GC-070 rather than half-built here.

Verified live in Chrome: Campaigns list shows real Open/Click numbers per row matching design's column layout; opened "July Product Update" (35 delivered, 16 opens, 6 clicks, 3 bounces from real seeded data) — stat cards, funnel bars, and ratio stats all show real, cross-consistent numbers (e.g. click-to-open 37.5% = 6 of 16 opened); clicked the "Clicked" tab and confirmed the recipient list actually filtered to the 6 real clicked recipients. `tsc --noEmit` clean on both apps, backend 72/72 Jest passing.

### GC-070 — Campaign compose: tag-based and individual-recipient audience modes
Surfaced by GC-069's design cross-check: the design's "New campaign" screen has a 3-way audience-mode toggle (List / Tags / Individual contacts) — Tags sends to anyone matching any selected tag, Individual lets an admin hand-pick specific recipients (the design's own copy: "useful for test or VIP sends"). This app's `campaigns` table only has a single required `listId` — no tag-filter or ad-hoc-recipient-set concept exists anywhere in the schema or `CampaignsService.send()`'s recipient resolution (`this.lists.listContacts(campaign.listId)`).

**Acceptance criteria:**
- `campaigns` gets a real way to target by tag(s) or by an explicit contact-id set, not just `listId` — needs a schema decision (e.g. a nullable `audienceType` + either `tagIds` or an ad-hoc join table) that doesn't quietly break the existing per-`listId` invariant other tickets (GC-050 circuit breaker, GC-053 large-send threshold) already depend on for "how many recipients."
- `CampaignsService.send()`'s recipient resolution branches on audience type instead of always calling `listContacts()`.
- Compose UI gets the real 3-way toggle, matching the design's tag-chip picker and individual-recipient search box.

**Resolved 2026-07-13**: this was the one genuinely open backlog ticket found while auditing for remaining work before a GitHub push — Sharifur chose the schema decision (a nullable `audienceType` enum + `tagIds` array, no new join table) over an ad-hoc `campaign_recipients` join table.

**Schema**: `campaigns` gets `audienceType` (`'list'|'tags'|'contacts'`, not null, default `'list'`), `listId` is now nullable (was required), plus new nullable `tagIds uuid[]` and `contactIds uuid[]` columns — real Postgres arrays, not a join table, matching the chosen option. Exactly one of `listId`/`tagIds`/`contactIds` is ever populated, matching `audienceType`; enforced in `CampaignsService.create()` (a clear 400 on a missing/mismatched combination), not a DB constraint.

**Backend**: new `CampaignsService.resolveRecipients(campaign)` is the single place that turns a campaign into its real recipient list regardless of audience type — `list` still calls the existing `ListsService.listContacts()`; `tags` does a `selectDistinct` join against `contactTags` for any contact holding at least one of the selected tags (any-match, per the design's own copy); `contacts` selects directly by the stored id array. Both `CampaignsService.send()`'s pre-send recipient-count/large-send-threshold check (GC-053) and `CampaignSendProcessor`'s actual send loop now call this same method — the "how many recipients" number and "who actually gets sent to" can never disagree, which was the exact risk flagged in this ticket's original acceptance criteria. `CampaignSendProcessor` now takes `CampaignsService` as a dependency instead of `ListsService` directly (same module, no circularity).

**Frontend**: `CampaignCompose.tsx`'s single "Audience (list)" panel is now a real 3-way tab toggle (List / Tags / Individual contacts). List mode is unchanged. Tags mode is a multi-select of colored tag pills (same pattern as GC-097's CSV import modal) plus an inline "create new tag" input. Individual-contacts mode is a searchable, checkbox-driven contact picker (capped at rendering 200 matches at a time for a large contact base) with a running "N contacts selected" count — matching the design's "useful for test or VIP sends" framing. The pre-send recipient count now recomputes per audience type: for tags, it unions `listContactsForTag()` results across all selected tags client-side (mirroring the backend's any-match resolution) rather than assuming a single list's contact count.

Verified live via curl against the real API (not just compiled): created three real contacts, tagged two of them with a shared tag, created a `tags`-audience dry-run campaign targeting that tag and a `contacts`-audience dry-run campaign targeting only the third (untagged) contact — sent both, then confirmed via `psql` that the tags campaign's `sends` rows were exactly the two tagged contacts and the contacts campaign's `sends` row was exactly the one hand-picked contact, no more, no less. All test data cleaned up afterward. Backend: 72/72 Jest passing (updated `campaign-send.processor.spec.ts`'s test module to provide `CampaignsService` and register the `campaign-send` BullMQ queue, matching the processor's new dependency), `tsc --noEmit` clean on both apps.

### GC-071 — Settings > Integrations: manage credentials from the UI (2026-07-12)
Sharifur asked for a settings page to manage AI/AWS/R2/"and others" credentials from the UI instead of hand-editing `.env`, specifically so they could be set up and then actually exercised. Every credential-gated feature this session (SES, R2, Reoon/NeverBounce, OpenAI/DeepSeek, Gmail OAuth, Slack, tracking) had been blocked purely on missing `.env` values — this makes that a real, working admin flow instead of a manual file edit + restart.

**Schema**: new `app_settings` table (`key` primary key, `value`, `updatedAt`). A DB row for a key always wins over the matching `process.env` value; deleting the row falls back to `.env` again.

**Encryption at rest**: every stored value is AES-256-GCM encrypted using the existing `token-encryption.util.ts` (already built for GC-044's Gmail refresh tokens, reused rather than duplicated), keyed off `JWT_SECRET` — reused rather than inventing a second required "encryption key" env var, since `JWT_SECRET` is already guaranteed to exist for the app to run at all.

**`SettingsService`** (`@Global()` module, injectable anywhere without explicit imports): loads all rows into an in-memory `Map` at boot and on every write — `get(key)` is a synchronous read (DB override, else `process.env`, else `undefined`), so every consuming provider keeps its exact original call shape (`this.config.get<string>(X)` → `this.settings.get(X)`), no async ripple-effect refactor needed. `setMany()` also mutates `process.env[key]` directly as a belt-and-suspenders measure — the AWS SDK's own default credential provider chain reads `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` straight from `process.env`, bypassing `ConfigService`/`SettingsService` entirely, so this is what actually makes a UI-saved AWS key work.

**No-restart-needed correctness**: two providers (`SesSenderProvider`, `R2Service`) previously built their SDK client once in the constructor — a UI-saved credential would never have taken effect without a server restart. Refactored both to build their client fresh on every call (`buildTransporter()`/`buildClient()`) instead of caching one at construction. Every other consuming file (`ReoonProvider`, `NeverBounceProvider`, `AiAssistService`, `SlackNotificationService`, `SenderAccountService`, `TrackingService`, `UnsubscribeController`, `SequenceRunnerService`, `CampaignSendProcessor`, `GmailOAuthService`, `GmailSenderProvider`, `GmailBounceScannerProcessor`) already read its config lazily per-call, so those were a direct `ConfigService` → `SettingsService` swap.

**API**: `GET/PATCH /settings/integrations`, `DELETE /settings/integrations/:key` — owner-only (matches `GET /audit-log`'s precedent; these are real production-service credentials). Secret fields (API keys, access keys, client secrets) are never sent back to the browser in plaintext — the response has `configured`/`source` (`db`/`env`/`unset`) only; non-secret fields (region, bucket name, from-email, etc.) are returned in full so the form can show the current value.

**Frontend**: new "Integrations" tab on `/settings` (owner-only, matches the backend guard), one card per category (AWS SES, Cloudflare R2, AI-assisted copy, Email verification, Gmail sending, Slack notifications, Tracking) with per-field inputs, a "saved here / from .env / not set" source indicator, and a "Clear" action to revert to `.env`. Saving a category submits only its own fields; an untouched secret field submits as an empty string, which the backend correctly treats as "leave unchanged" rather than "set to empty."

Verified live in Chrome: opened Settings > Integrations, saved a real `AWS_REGION` value, confirmed via `psql` it landed as an encrypted row in `app_settings`; confirmed via a direct API call that a stale in-memory cache (from a manual DB delete bypassing the service) was exactly the failure mode the cache design predicts, then confirmed the real `DELETE` endpoint clears it correctly (`configured: false`, `source: unset`) and the DB row count returns to 0. Fixed 4 existing real-DB Jest test files that constructed `SesSenderProvider`/`R2Service`/`SequenceRunnerService`/`CampaignSendProcessor`/`PasswordResetService` directly with a hand-rolled fake `ConfigService` — updated to `SettingsService` (same `get()` shape, so the fakes needed only a type-level swap) and added `SettingsService` to each spec's lean `TestingModule` providers list. Backend: 72/72 Jest passing, `tsc --noEmit` clean on both apps.

### GC-072 — Fix: contact tag pill color not reflecting DB value (2026-07-12)
Reported directly: tag pills in the Contacts list weren't showing their real stored color (the tag-color feature itself was added earlier this session — schema, color picker, Lists & Tags page — but never wired into the Contacts list's own tag rendering). Root cause: `ContactsService.findAll()`'s tag-join `select()` only pulled `id`/`name`, never `color`, and the frontend `Contact.tags` type matched that shape — the color existed in the DB and in the standalone Lists & Tags page, but silently never reached this one call site.

Added `tags.color` to the join's `select()` and the `tagsByContact` map's shape; added `color` to the frontend `Contact['tags']` type. `ContactsList.tsx`'s tag pills and `ContactDetail.tsx`'s tag-toggle buttons (the "has this tag" state) now render with the real color — a translucent tint background (`${color}1F`), a matching border (`${color}4D`), and solid-color text, the same 8-digit-hex-alpha technique used nowhere else yet in this codebase but straightforward given hex colors from the native `<input type="color">` picker are always 6-digit.

Verified live: Contacts list now shows genuinely distinct pill colors per tag (Customer green, Investor pink, Lead blue, Churned orange, etc.) matching their real `tags.color` values, not the previous flat gray. `tsc --noEmit` clean on `apps/web`.

### GC-073 — Campaign detail recipient rows: match Contacts page (2026-07-12)
Reported directly: the recipient list on Campaign Detail showed a plain avatar (2-letter slice of the raw email, not real initials) and email text with no link — inconsistent with the Contacts list's actual contact-cell treatment (colored avatar from real initials, name-over-email, clickable through to `/contacts/:id`).

Replaced the ad-hoc `initials(email)` helper with the exact `initials(contact)`/`displayName(contact)` functions from `ContactsList.tsx` (first/last-initial-or-email-first-char, name-or-email fallback — kept in sync rather than diverging). Each row is now a real `<Link to={/contacts/${id}}>` wrapping the same avatar-circle + stacked-name/email markup used in Contacts, falling back to the raw contact id (unlinked) only in the edge case where the contact lookup somehow misses.

Verified live: Campaign Detail's recipient list now shows real names ("Morgan Jackson," "Dana Kim") with colored avatars identical to the Contacts page's own rendering, and clicking a row navigates to that contact's real `/contacts/:id` detail page. `tsc --noEmit` clean on `apps/web`.

### GC-074 — Sequences list + builder: rebuild to match design (2026-07-12)
Cross-checked `SequencesList`/`SequenceBuilder` against the design's `SEQUENCES`/`SEQUENCE BUILDER` screens. The list only had Sequence/Steps columns (missing Enrolled/Open/Status, and computed step counts via an N+1 `Promise.all(seqs.map(listSteps))` instead of one query); the builder rendered every step (including `wait` steps) as its own identically-styled card with a type dropdown, rather than the design's grouping — each visible card is a "Send email" step with its delay control attached directly (a "Delay before this step" row shown only for non-first steps), no separate wait-step cards.

**Backend**: `SequencesService.findAll()` now computes `stepCount`/`enrolledCount`/`openCount`/`hasActiveEnrollments` per sequence via the same aggregation pattern as templates/campaigns (grouped counts over `sequence_steps`/`sequence_enrollments`/`sends`+`email_events`, not stored). `hasActiveEnrollments` is real but deliberately not a persisted "sequence status" — invariant 1 is explicit that there's no sequence-wide clock/status, so this is just "does it currently have ≥1 active enrollment," recomputed each read. New `GET /admin/sequences/:id/enrollments` on `AdminEnrollmentController` — `EnrollmentService.listForSequence()` already existed server-side but had no route exposing it until now.

**Frontend data model — the interesting part**: rather than changing the `sequence_steps` schema (still `send_email`/`wait`/`condition`/`exit` rows, exactly as the sequence runner expects), `SequenceBuilder.tsx` groups adjacent `[wait, send_email]` pairs into one visual "block" client-side (`buildBlocks()`). Each send block's delay control edits the paired `wait` step if one exists, or transparently creates one (`addStep` + `reorderSteps` to slot it immediately before the send step) the first time a user changes the delay away from its default. Moving a block up/down or removing it operates on the whole pair together (`flattenBlockIds()` rebuilds the full step-order array from the reordered blocks) so the delay always stays attached to the send step it belongs to. This gets the design's visual grouping with zero schema or sequence-runner changes — verified concretely: added a real step, set a 3-day delay, and confirmed via `psql` the underlying rows are still two separate `sequence_steps` (`wait` then `send_email`) in the correct order, exactly what the runner's `resolveFirstExecutableStep`/`resolveNextExecutableStep` already expect.

**Variant chips reuse GC-068 directly**: a send block with a template selected fetches that template's siblings (`listTemplateVariants` on the resolved parent id) and renders them as selectable chips ("Original" + each variant name) — clicking one repoints the step's `templateId`. "+ Manage variants" opens the real template editor (where Shuffle/AI-variant/save-as-variant already lives, GC-068) in a new tab rather than duplicating that UI inline.

**Deliberate deviations from the design, not silently faked**:
- Dropped the "Reply" column/metric everywhere — no reply-detection feature exists in this app (only open/click tracking + DSN-bounce heuristics), so a "Reply" number would be fabricated.
- Dropped the blue "Steps send only on business days between 8am–5pm in each contact's timezone" info box — no business-hours/timezone logic exists anywhere in `sequence-runner/`; the design's claim is false for this app as built.
- Dropped the design's always-visible "Save changes" button — every field already writes through immediately on change/blur (a better UX than an unsaved-changes model), so a batched-save button would either do nothing or misleadingly imply other fields aren't already saved.
- The step-type dropdown (send_email/wait/condition/exit) is gone from the primary flow — "Add step" always adds a real send block; pre-existing `condition`/`exit` rows (found live in dev data as stray `exit` steps) still render, just as a minimal unstyled row with move/remove only, since the design has no visual language for them at all.

Verified live in Chrome: Sequences list shows real Enrolled counts (3, 1) matching real `sequence_enrollments` rows. Opened a sequence, added a step, selected "Campaign spintax template," confirmed its real saved variant ("Variant 1") rendered as a chip and clicking "Original"/the variant swapped `templateId` correctly. Added a second step, set a 3-day delay — summary panel's "Total duration" updated to "3d" live, and `psql` confirmed the exact expected `wait`→`send_email` row order. Enrolled contacts tab showed 3 real completed enrollments with correct avatars/names/status (no pause/stop actions shown for completed — matches the design's action-gating). Cleaned up the test steps afterward to restore the sequence to its original state. Backend: 72/72 Jest passing, `tsc --noEmit` clean on both apps.

### GC-075 — Trigger detail page: fired-events history + stats (2026-07-12)
Sharifur asked for a trigger detail page holding "the events that triggered, or stats." Researched first rather than guessing at scope: the design file has no `Trigger detail` screen at all (unlike `Campaigns`, which has both a list and a detail screen) — the `Triggers` list row shows a `{{ t.fires }} fired` badge but nothing backs it, and no ticket had ever scoped a detail/history view. Also confirmed no fire-history table existed anywhere (`TriggerEvaluationService.evaluate()` and `ScheduleTriggerProcessor.process()` only logged to `Logger`, never persisted a record of what matched).

**Schema**: new `trigger_evaluations` table (`triggerId`, `contactId`, `eventType`, `enrolled` bool, `error`, `createdAt`). Deliberately logs one row per real **match** ("fire"), not every evaluation attempt — same reasoning as `webhook_deliveries` logging real deliveries rather than every incoming request. `enrolled: false` isn't a failure state by itself — it also covers the expected "contact already has an active/paused enrollment" case (invariant 1's own guard), which is still a real fire, just one that didn't create a new enrollment; a genuine error is captured in `error` and only that case gets logged as an actual error.

**Backend**: both `TriggerEvaluationService.evaluate()` (event-driven triggers) and `ScheduleTriggerProcessor.process()` (cron triggers) now insert a `trigger_evaluations` row on every match, success or benign-skip. `TriggersService.getStats(id)` (total fires / enrolled / skipped / last-fired-at) and `listEvaluations(id, limit)` (joined with `contacts` for email) are both new, aggregated the same way as every other list/detail screen this session (templates, campaigns, sequences) — computed from real rows, never stored counters that could drift. `TriggersService.findAll()` also now returns a real `firedCount` per trigger, which is what the design's own list-row badge needed all along — fixed as a direct byproduct of building this. New routes: `GET /triggers/:id/stats`, `GET /triggers/:id/evaluations`.

**Frontend**: `Triggers.tsx` rows are now links to `/triggers/:id` and show the real fired count. New `TriggerDetail.tsx` (no design screen to match, so modeled on the existing `Campaign Detail`/`Webhooks` delivery-log visual language already established in this app): status badge, event→sequence subtitle (sequence name links to the real sequence builder), 4 stat cards (Total fires / Enrolled + success rate / Skipped / Last fired), and a fired-events table (contact avatar+email — linking to `/contacts/:id` — event type, Enrolled/Error/Already-enrolled result, timestamp).

Verified live end-to-end, not just visually: created a real temporary trigger (`contact.created`, a condition guaranteed to match) via the API, created a real contact through the actual UI-backed endpoint, and confirmed via `psql` a real `trigger_evaluations` row landed (`enrolled: true`). Loaded the detail page and confirmed it showed the exact same real data (1 total fire, 100% enrolled, correct timestamp, the real contact's email linking to its real contact page) — proving the full pipeline (event bus → condition match → enroll → logged fire → stats/history read path) works, not just that the UI renders sample shapes. Deleted the temp trigger afterward and confirmed via `psql` the cascade delete correctly removed its `trigger_evaluations` rows too. Backend: 72/72 Jest passing, `tsc --noEmit` clean on both apps.

### GC-076 — Webhook-based trigger type (2026-07-13)
Sharifur asked for webhook-based trigger support. Rather than building a second, parallel unsigned webhook path just for triggers, this reuses the entire existing HMAC-signed inbound webhook framework (GC-040, invariant 4) end to end — a webhook trigger is a normal `Trigger` row (`eventType: 'webhook'`) pointed at one specific `webhook_endpoints` row via a new `triggers.webhookEndpointId` FK (`onDelete: 'set null'` — deleting the endpoint shouldn't silently delete the trigger, just leave it unable to fire until repointed).

**Backend**: `InboundWebhookController.receive()` now emits a real `webhook.received` event (`EventEmitter2`, invariant 12) after a successful signature-verified contact upsert — carrying the contact id, the endpoint id, and every raw payload field (not just the ones mapped to firstName/lastName), so a trigger condition can reference any field the sender actually included (e.g. a `plan` field from a Stripe-shaped payload), not only the fields the endpoint's field-mapping happens to map to contact columns. `TriggerEvaluationService.handleWebhookReceived()` listens for it and — unlike every other event type, where any active trigger for that event type is a candidate — scopes to triggers actually configured against the specific endpoint the payload arrived on (`TriggersService.findActiveWebhookTriggers()`). `evaluate()` was refactored to accept an optional pre-fetched trigger list so both the generic per-event-type path and this endpoint-scoped path share the same match/enroll/log logic.

**Frontend**: `NewTriggerModal` gets a third trigger-type option ("Webhook-based") — pick an existing endpoint (created on the Webhooks page) plus the same field/op/value condition builder used by condition-based triggers, evaluated against the raw payload. `Triggers.tsx` and `TriggerDetail.tsx` both render the endpoint name/slug in the event subtitle instead of a bare `webhook` string.

Verified live end-to-end through the real UI and a real signed HTTP call, not shortcuts: created a real webhook endpoint via the API, created the trigger through the actual `NewTriggerModal` UI (verified the endpoint auto-populated in the dropdown, condition set to `plan equals pro`), then POSTed a real HMAC-SHA256-signed payload to `/webhooks/in/:slug` with curl — got `{"received":true}`, and confirmed via `psql` a real `trigger_evaluations` row landed (`event_type: webhook, enrolled: true`) for the real contact the payload upserted. (Caught one real gap while testing: a webhook endpoint created with an empty `fieldMapping` never resolves an email, so the contact upsert — and therefore the event emission — is silently skipped; this is correct existing GC-040 behavior, not a bug, but confirms the endpoint's field mapping has to actually be configured for anything downstream to fire.) Cleaned up the temp trigger, endpoint, and contact afterward. Backend: 72/72 Jest passing, `tsc --noEmit` clean on both apps.

### GC-077 — Sender Accounts: multiple named AWS SES accounts (2026-07-13)
Sharifur asked to fix the Sender Accounts page: allow adding another Google account (already fully wired — GC-044's real OAuth connect/callback flow was already correctly hooked up to a working "Connect Gmail account" button; nothing was actually broken there) and allow editing/adding multiple AWS accounts (a real gap — SES only ever had one lazily-materialized account driven by the single global Settings > Integrations AWS_* values, with no create/edit UI at all, unlike Gmail's real connect flow).

**Schema**: `sender_accounts` gets optional per-row AWS fields (`awsRegion`, `awsAccessKeyId`, `awsSecretAccessKeyEncrypted`, `sesConfigurationSet`) — all nullable. Left blank, a SES account falls back to the global Settings > Integrations AWS_* values at send time, same DB-overrides-env pattern used everywhere else (GC-071); filled in, it's a genuinely separate AWS account/region.

**Backend**: new `SenderAccountService.createSesAccount()`/`update()`/`remove()`, a shared `appEncryptionSecret()` helper extracted from `SettingsService`'s own encryption logic into `token-encryption.util.ts` (both now derive the same AES key from `JWT_SECRET` rather than duplicating that reasoning twice). `SesSenderProvider.buildTransporter()` now accepts the sending `senderAccountId`, looks up that account's row, and prefers its per-account region/credentials/configuration-set when present — falling back to the global values field-by-field otherwise. New routes: `POST /sender-accounts/ses`, `PATCH /sender-accounts/:id`, `DELETE /sender-accounts/:id`. `listAll()` was changed to an explicit column `select()` that excludes encrypted secrets and the plaintext access key id entirely — it previously returned every raw column, including `gmailRefreshTokenEncrypted`, to the browser; tightened this while already touching the method, matching the "never send secrets to the client" principle already established for Settings > Integrations.

**Frontend**: new `SesAccountModal` (create/edit) with an explicit "blank = use Settings > Integrations" hint next to the credentials fields; each SES card now shows its region and a "own AWS credentials" vs "using Settings > Integrations" badge, plus real Edit/Deactivate/Delete actions (previously the cards were read-only with no actions at all).

Verified live: added a second real AWS SES account ("gc077-second-account@example.com," region `us-west-2`, no credentials) through the actual modal — confirmed it rendered with the `us-west-2` region badge and the correct "using Settings > Integrations" fallback badge (proving the per-account-vs-global precedence renders correctly), then deleted it via the real API and confirmed the original single SES account was untouched. Backend: 72/72 Jest passing, `tsc --noEmit` clean on both apps.

### GC-078 — Replace Unicode-glyph icons with SVG icons (2026-07-13)
Reported directly: `SequenceBuilder.tsx` and `Triggers.tsx` used bare Unicode characters (▲▼✕●⏱⚡) as ad-hoc icons instead of the stroke-SVG icon language used everywhere else in the app (`Layout.tsx`'s `ICONS`, every toolbar/action icon on other screens). New shared `components/icons.tsx` (`ChevronUpIcon`, `ChevronDownIcon`, `CloseIcon`, `ContactsEnterIcon`, `ClockIcon`, `BoltIcon`, `WebhookIcon` — the last added directly in support of GC-076's webhook trigger type) replaces every glyph usage in both files and in `NewTriggerModal.tsx`'s close button.

Verified live: both pages render clean stroke-icons with no Unicode glyphs anywhere — confirmed via the same screenshots used to verify GC-076/077 above, which happened to exercise both pages after this change.

### GC-079 — Site chrome: page titles, footer, top-bar user dropdown, change password (2026-07-13)
Sharifur asked for four things: a real per-page document title (`index.html`'s `<title>` was the untouched Vite placeholder `"web"`, never updated per route), consistent favicon (already structurally consistent — single SPA entry point, one `<link rel="icon">` — and the existing `favicon.svg` is already the real brand mark, the same purple paper-plane gradient used in the sidebar header, so left as-is rather than inventing a different one), a footer with "copyright by xgenious.com" on every page, and a top-bar user dropdown holding Profile + Change Password (previously the only user-identity element was a static block at the bottom of the sidebar with no menu, just a bare sign-out button).

**Titles**: `Layout.tsx` now keeps a `pathname → label` map and sets `document.title = "<Page> · geniusCampaign"` in a `useEffect` keyed on `useLocation().pathname` — covers every route since it lives in the shared shell, not per-page. `index.html`'s static fallback also fixed to `geniusCampaign` (was `web`) for the brief pre-hydration flash.

**Footer**: new `components/Footer.tsx`, a single `© {year} xgenious.com. All rights reserved.` line, rendered once in `Layout.tsx` below `<main>` so it's automatically on every authenticated page without per-route wiring.

**Top-bar dropdown**: moved the user identity block out of the sidebar footer and into the header, next to the existing "New" button — avatar + email + chevron, click opens a menu with email/role header, Profile, Change password, and Sign out (previously a bare icon button). Sidebar bottom now only has the Settings link.

**Profile page** (new, `/profile`): deliberately scoped to exactly what the `users` schema actually has (`id`/`email`/`role`/`createdAt`) — no invented name/avatar/bio fields. Shows avatar-with-initials, email, role badge, "Member since {date}".

**Change password** (new, `/settings/change-password` + backend): no authenticated self-service password-change endpoint existed before this — `UsersService.setPassword()` existed but was dead code, wired only for the separate logged-out forgot/reset-password flow (GC-064). Added `AuthService.changePassword(userId, currentPassword, newPassword)` (bcrypt-compares the current password against the stored hash before calling the existing `setPassword`, cost-12 bcrypt matching every other password op in this codebase) behind a new `PATCH /auth/me/password` (`JwtAuthGuard` only — any authenticated role, not RBAC-scoped, since this isn't in GC-056's named scope and there's no reason to restrict changing your own password by role). Also added `GET /auth/me` (returns id/email/role/createdAt) since the frontend's persisted auth state only carries id/email/role from login — the Profile page's "member since" needed a real `createdAt` from the server.

Verified live end-to-end against the actual running app, not just compiled: logged in as the real `trigger-test@example.com` test user, confirmed `GET /auth/me` returns real data, confirmed `PATCH /auth/me/password` correctly 401s on a wrong current password and correctly 200s (round-tripped the password back to its original value, no net change) on the right one. In Chrome: confirmed the tab title changes per route (`Dashboard · geniusCampaign`, `Profile · geniusCampaign`, `Change Password · geniusCampaign`), confirmed the footer renders on the dashboard, opened the top-bar dropdown and confirmed Profile/Change password/Sign out all render with correct icons (caught and fixed one bug before this: `UserIcon`/`LockIcon` are standalone `<svg>` components, and the first draft wrapped them in the existing `NavIcon` wrapper — itself an `<svg>` — which would have nested `<svg>` inside `<svg>`; fixed by rendering them directly, matching how `CloseIcon` is used elsewhere in the codebase). Navigated to Profile and confirmed it shows the real signed-in user's actual email/role/join-date. Filled out Change Password with the real current password and same new password through the actual form UI and confirmed the form cleared (success path) with no error.

One environment note: the API and web dev servers needed to be started on non-default ports (3002/vite default 5173 with a temporary `VITE_API_BASE_URL` override) for this verification pass, because port 3000 was occupied by an unrelated `next-server` process from a different project (`taskip-client`) already running on this machine — not something this session started, so it wasn't killed. Both temporary processes and the temporary `.env.local` were cleaned up afterward; the web dev server was restarted on its normal config. The API dev server is not currently running on port 3000 — it needs that port freed (or a permanent alternate `PORT`/`VITE_API_BASE_URL` decision) before normal `npm run dev` can be used again on this machine. `tsc --noEmit` clean on both apps.

**Correction, found during GC-080's verification pass:** the port-3000 conflict was already permanently solved before this ticket — root `.env` already sets `PORT=3001`/`VITE_API_BASE_URL=http://localhost:3001` (from an earlier session not visible in this one's context), and `apps/web/vite.config.ts` has `envDir: '../../'`, meaning Vite only ever reads env files from the **repo root**, never `apps/web/.env*`. The `apps/web/.env.local` file created above did nothing — Vite silently ignored it — and the "temporary alt-port" testing in this entry actually worked by accident (I'd also manually started the API with an explicit `PORT=` override, bypassing the ignored file). No lasting harm, but: **don't create `apps/web/.env.local` for API-URL overrides — it's a dead file given `envDir`.** Just run `npm run dev:api`/`npm run dev:web` as-is; they already agree on port 3001 via root `.env`.

### GC-080 — Settings cleanup (remove AWS/Gmail/Slack categories, sub-tab the rest) + editable Profile (2026-07-13)
Sharifur asked for two things: trim the Settings > Integrations panel (AWS SES and Gmail sending are now fully manageable on the dedicated Sender Accounts page — GC-077 — so keeping them editable in two places risked the two going out of sync; Slack notifications should be removed outright) and convert whatever categories remain into sub-tabs instead of a stacked card list; and add actual edit capability to the Profile page, which previously only displayed email/role/join-date with no way to change any of it.

**Settings cleanup**: removed the `aws`, `google` ("Gmail sending"), and `slack` categories from `known-settings.ts` entirely — this only removes their DB-override editing surface via the Settings UI, it doesn't touch the underlying features. `SettingsService.get()` still falls through to `process.env` for any key regardless of whether it's in `SETTING_CATEGORIES`, so `AWS_*`/`GOOGLE_OAUTH_*`/`SLACK_WEBHOOK_URL` are all still read from `.env` exactly as before (confirmed live: `SlackNotificationService` still logs its normal "SLACK_WEBHOOK_URL is not configured" warning on a circuit-breaker trip, proving the feature itself is untouched, just no longer settings-UI-editable). The remaining 4 categories (Cloudflare R2, AI-assisted copy, Email verification, Open/click tracking) are now rendered as an actual sub-tab bar in `Settings.tsx`'s `IntegrationsPanel` (one category visible at a time, defaulting to the first) instead of every category stacked as its own card on one long page.

One consequence worth flagging: the *global* AWS fallback values (`SES_FROM_EMAIL`, and the region/credentials/configuration-set a SES account falls back to when it has none of its own — GC-077's DB-overrides-env pattern) are no longer editable from any UI at all, only `.env` — the Sender Accounts page only manages *per-account* overrides, not the global fallback. This is a direct, deliberate consequence of what was asked ("already available in a separate page"), not an oversight, but it means the very first SES account (lazily created with no credentials) still depends on `.env` values with no in-app way to set them.

**Profile edit**: the `users` table had no `name` column at all — added one (`db/migrations/0022_puzzling_crusher_hogan.sql`, nullable `text`, real Drizzle migration generated and applied against the local dev DB) rather than inventing a fake field or overloading `email`. New `UsersService.updateProfile(userId, {name?, email?})` — checks email uniqueness against the existing `users_email_unique_idx` constraint before updating (a real conflict check, not just letting the DB throw) — behind a new `PATCH /auth/me` (`AuthController`, `JwtAuthGuard` only, same as the other `/auth/me*` routes from GC-079). `Profile.tsx` now has an "Edit profile" button that swaps the read view for a form (name + email inputs, Save/Cancel); on save it updates local state and pushes the new email into `useAuthStore` (via the existing `setSession` with the same token) so the top-bar dropdown reflects a changed email immediately without requiring re-login. Deliberately did not add a name field at registration/login — only this edit surface — since that wasn't asked for and the schema change alone (nullable, defaults to unset) doesn't require it.

Verified live end-to-end: `GET /settings/integrations` now returns exactly `['r2','ai','verification','tracking']` (confirmed via curl), and in Chrome the Integrations tab renders a 4-item sub-tab bar with no AWS/Gmail/Slack anywhere, each sub-tab switching correctly and showing real `source: env` values. Edited the real signed-in test user's profile through the actual UI — set name to "Sharifur Rahman," saved, and confirmed the read view immediately showed the new name with updated avatar initials ("SH") and the email still correct underneath. Backend: 72/72 Jest passing, `tsc --noEmit` clean on both apps.

**Verification detour, worth recording**: while testing this, the Integrations tab initially rendered with an empty sub-tab bar (categories fetched but never displayed) even after a hard page reload and a brand-new browser tab — which led to discovering the root-`.env`/`envDir` situation described in the GC-079 correction above. Once the API was started plainly (`npm run dev:api`, no `PORT=` override, correctly binding 3001 per root `.env`) and the stray `apps/web/.env.local` was deleted, the Integrations sub-tabs rendered correctly on the first try.

### GC-081 — AI-assisted copy: configurable model, real Provider/Model selects (2026-07-13)
Sharifur asked for two things on the AI-assisted copy settings: multi-provider support (openai/deepseek) — which the underlying `AiAssistService` already had (`LLM_PROVIDER` fully switches which real provider/API key is used, no stub fallback, per GC-059's original design) — and for Provider and Model to render as real `<select>` dropdowns instead of free-text inputs. The actual gap was that **model was hardcoded per provider** (`gpt-4o-mini` for OpenAI, `deepseek-chat` for DeepSeek, baked into `AiAssistService.getProvider()`) with no way to choose a different model at all.

**Backend**: added a `LLM_MODEL` setting key (`known-settings.ts`), read in `AiAssistService.getProvider()` and passed to `OpenAiCompatibleProvider` — falls back to the existing per-provider default (`DEFAULT_MODELS` map) when unset, so behavior is unchanged for anyone who never touches the new field. `SettingDef` gained an optional `options?: string[]` (static option list for select-rendering) — `LLM_PROVIDER` now declares `options: ['openai', 'deepseek']`; `SettingFieldStatus`/`getAllForDisplay()` pass `options` through to the frontend so this is a generic mechanism, not a one-off special case in the API layer.

**Frontend**: `Settings.tsx`'s field renderer now renders a `<select>` whenever a field has `options` (generic, works for any future field) — plus one deliberately-scoped special case: `LLM_MODEL` has no static `options` (its valid choices depend on the sibling `LLM_PROVIDER` value), so its select list comes from a local `AI_MODEL_OPTIONS` map (`openai: [gpt-4o-mini, gpt-4o, gpt-4-turbo]`, `deepseek: [deepseek-chat, deepseek-reasoner]`, kept in sync via a comment with the backend's `DEFAULT_MODELS`) keyed off the current in-progress `LLM_PROVIDER` form value. Switching the Provider select now also clears the in-progress `LLM_MODEL` value, so a model belonging to the old provider is never silently saved alongside the new provider — the Model select recomputes its own list and default the moment Provider changes.

Verified live: `GET /settings/integrations` confirms `LLM_PROVIDER` now carries `options: ['openai','deepseek']`; `PATCH /settings/integrations` with `{LLM_PROVIDER: 'deepseek', LLM_MODEL: 'deepseek-reasoner'}` saves and reads back correctly (`source: db`), then cleared back to `.env` defaults via the real clear endpoint. In Chrome: both Provider and Model render as actual `<select>` elements (not text inputs) defaulting to `openai`/`gpt-4o-mini`; switching Provider to `deepseek` via the select correctly swapped the Model dropdown's options to `deepseek-chat`/`deepseek-reasoner` with `deepseek-chat` selected by default — confirmed via both a screenshot and reading the live DOM's `<select>` option lists. No changes were actually saved during this exploratory test (Save was never clicked), so the account's real AI settings are untouched. Backend: 72/72 Jest passing (all 5 existing `ai-assist.service.spec.ts` cases still pass unchanged, since the new `LLM_MODEL` fallback preserves the exact same hardcoded defaults those tests assert on), `tsc --noEmit` clean on both apps.

### GC-082 through GC-089 — Team invite, three paginated admin pages, name display, config help dialogs, faster bulk-verify feedback, current AI model lists (2026-07-13)
Sharifur's message this round was a batch of eight distinct asks — ticketed and implemented in one pass since they're all small, independent changes touching the same handful of admin screens. Research agents were used up front (bulk-verify/team-members architecture; the three pagination targets) to avoid guessing at existing conventions before writing code.

**GC-089 — current model lists**: web-searched (and directly fetched, since blog-aggregator search snippets floated implausible marketing names) `developers.openai.com/api/docs/models/all` and `api-docs.deepseek.com/quick_start/pricing/` for ground truth. Found DeepSeek's `deepseek-chat`/`deepseek-reasoner` — GC-081's just-picked defaults — are being deprecated 2026-07-24 (11 days out) in favor of `deepseek-v4-flash`/`deepseek-v4-pro`, so this was a real, time-sensitive fix, not cosmetic. Updated `AiAssistService.DEFAULT_MODELS` (openai → `gpt-5.4-mini`, deepseek → `deepseek-v4-flash`) and `Settings.tsx`'s `AI_MODEL_OPTIONS` (curated 3-5 cost-sensitive options per provider, not every ID OpenAI exposes — this feature generates short marketing copy, not general-purpose reasoning). Updated the two `ai-assist.service.spec.ts` assertions that hardcoded the old model IDs.

**GC-086 — name in top bar**: `users.name` (added last session, GC-080) was never returned by login/register, so `useAuthStore`'s persisted session had no name to show even after a user set one via Profile. Added `name` to `AuthService.buildTokenResponse()`'s `user` object (both `login` and `register` flow through it) and to `AuthUser`/`AuthResponse` types. `Layout.tsx` now computes `displayName = user.name || user.email` and uses it everywhere the top bar previously hardcoded `user.email` (avatar initials, button label, dropdown header — which now also shows the email as a smaller line underneath when a name is set, so identity isn't lost). `Profile.tsx`'s post-save `setSession` call now passes `name` through too, so an edit reflects immediately without re-login.

**GC-087 — config help dialogs**: added an optional `instructions?: string[]` to `SettingCategory` (`known-settings.ts`) — real, step-by-step setup instructions (where to find each credential in the Cloudflare dashboard / Reoon / NeverBounce, not generic filler) for the `r2` and `verification` categories specifically, since those are the two that require configuration in an external dashboard the admin might not have open. Piped through `SettingCategoryStatus`/`getAllForDisplay()` to the frontend. `Settings.tsx` renders a small info-icon button next to any category that has instructions, opening a click-triggered modal (not a hover tooltip — those are fragile to test and to use reliably) listing the steps as an ordered list. New shared `InfoIcon` in `components/icons.tsx`.

**GC-088 — faster bulk-verify feedback**: the polling loop already existed end-to-end (BullMQ job id + status endpoint + progress percentage, from GC-062) — this was a one-line interval change (800ms → 10s) plus firing the first status check immediately on start (via an internal `tick()` helper called once before `setInterval`) so the UI doesn't sit at 0% for a full 10 seconds after clicking "Bulk verify."

**GC-083/084/085 — server-side pagination for Audit log, Suppression list, Email log**: research surfaced that this repo's only existing "pagination" (Contacts list) is entirely client-side (fetches the whole table, slices in memory) — fine for a bounded dataset, not something to replicate for logs that only grow. Established one shared envelope, `{ data, total, page, limit }`, applied to all three:
- `AuditLogService.listAll(page, limit)` and `SuppressionService.listAll(page, limit)` gained real `LIMIT`/`OFFSET` (suppression had none at all before) plus a `count(*)::int` query run in parallel via `Promise.all`.
- `EmailLogService.list()` already had `limit`/`offset` (GC-060) — replaced the raw `offset` param with `page` (computed internally) for consistency with the other two, and added the missing count query; this is the one actual breaking change (bare array → envelope), so `email-log.service.spec.ts`'s one assertion on the return shape was updated (`.data`/`.total` instead of a bare array).
- Frontend: new shared `components/PaginationBar.tsx` (Previous/Next + "Showing X–Y of Z", visually matching Contacts' existing pagination footer exactly) used by `Settings.tsx` (Audit log and Suppression list tabs, 20/page) and `EmailLog.tsx` (50/page, its existing client-side search now explicitly scoped to "search within this loaded page" with a note, since a true server-side search wasn't asked for). Shared `Page<T>` type added to `lib/api.ts` rather than duplicated per API-client file.

**GC-082 — owner-only "Add member"**: confirmed via research that this repo had zero admin-create path (only unauthenticated self-`register`, first-user-becomes-owner, no role parameter) — CLAUDE.md's invariant 11 explicitly rules out an *email-invite* flow, not an admin-direct-create one, so this is additive, not a violation. New `UsersService.createByAdmin(email, password, role)` — same conflict check and bcrypt-12 hashing as `register()`, but the caller supplies the role directly rather than it being derived from "am I the first user." New `POST /users` (`@Roles('owner')`, wrapped in a `drizzle.db.transaction` alongside an `AuditLogService.record()` call, matching `TagsController`'s established transaction+audit pattern) and a new `AddMemberModal.tsx` (email + password + role select) wired into the Members tab's new "Add member" button. Deliberately no email is sent anywhere in this flow — the owner sets the initial password directly and shares it out of band, consistent with this being an internal tool rather than a product with its own onboarding emails.

Verified live end-to-end for every piece, not just compiled: created a real member via `POST /users` (`gc082-test-member@example.com`, role `editor`), immediately logged in as that exact account with the admin-set password to prove it's a real, usable login (not just a DB row), confirmed a duplicate-email `POST /users` correctly 409s, then deleted the test user and its audit-log row via `psql`. Confirmed via curl that `/audit-log`, `/suppression-list`, and `/email-log` all now return the `{data,total,page,limit}` envelope with real counts (80, 59, and 175 rows respectively in this dev DB). In Chrome: logged out and back in fresh to prove the top bar picks up a previously-set name from a real login response (not just a stale cached session) — showed "Sharifur Rahman" instead of the email; paged through Audit log (1–20 of 80 → 21–40 of 80, different rows), Suppression list (1–20 of 59), and Email Log (1–50 of 175 → next page showed a distinct batch of sends); opened the Cloudflare R2 "How to configure" dialog and confirmed the real 5-step instructions render. Backend: 72/72 Jest passing, `tsc --noEmit` clean on both apps.

### GC-090 through GC-094 — AI key visibility bug, real favicon, /about promo page, member name field, logo tagline (2026-07-13)
A follow-up batch of five small fixes on top of the last session's work, caught by Sharifur while reviewing it live.

**GC-090 — AI settings logical bug**: GC-081/089's Provider/Model selects still showed both the OpenAI *and* DeepSeek API key inputs regardless of which provider was selected — confusing, since only the active provider's key is ever read (`AiAssistService.getProvider()` only calls `this.settings.get('OPENAI_API_KEY')` or `DEEPSEEK_API_KEY`, never both). Fixed by filtering `category.fields` in `Settings.tsx` before rendering: for the `ai` category only, `OPENAI_API_KEY` is hidden unless the in-progress `LLM_PROVIDER` value is `openai`, and `DEEPSEEK_API_KEY` unless it's `deepseek`. Provider/Model themselves are never filtered.

**GC-091 — real favicon**: the existing `favicon.svg` was an abstract multi-gradient artistic mark that didn't match the actual in-app logo (the simple white paper-plane-on-purple-gradient-square used in the sidebar header and login page). Replaced it with an SVG built from the exact same icon paths (`M22 2 11 13` / `M22 2 15 22l-4-9-9-4z`) and the same gradient stops (`#6366F1` → `#4F46E5`) as the real logo, so the browser tab icon now matches the product's actual brand mark instead of a disconnected one.

**GC-092 — `/about` page**: new public route (outside `ProtectedRoute`, reachable without login) positioning geniusCampaign as free and open source, "by xgenious.com" — a real feature list (contacts/lists/tags, template editor with spintax + AI assist, sequences, campaigns, verification, triggers/webhooks, sender rotation) drawn from what's actually built, not invented marketing copy, plus a link out to xgenious.com. `Footer.tsx`'s "xgenious.com" text is now a `<Link>` to this page (previously plain text) so it's reachable from every authenticated page too.

**GC-093 — member name field**: `AddMemberModal.tsx` gained an optional Name input alongside email/password/role. `CreateUserDto` gained an optional `@IsOptional() @IsString() name`, `UsersService.createByAdmin()` takes it as a new parameter (before the trailing `db` tx param) and includes it in the insert — reuses the `users.name` column added in GC-080, no schema change needed.

**GC-094 — logo tagline**: "Internal outreach platform" (the sidebar header and the login page both had their own copy of this) replaced with "by xgenious.com" in both places, dropping the generic internal-tool description in favor of consistent attribution matching the footer and the new About page.

Verified live in Chrome: switched the AI category's Provider select to `deepseek` and confirmed the OpenAI API key input disappeared while DeepSeek API key appeared (and vice versa back to `openai`) — no save was clicked, so nothing was persisted, this was purely a UI-filter check. Loaded `/favicon.svg` directly and zoomed in — confirmed it's the same purple-gradient-square-with-white-paper-plane mark used in the sidebar, not the old abstract splash icon. Loaded `/about` and confirmed it renders the real feature grid and links out to xgenious.com. Created a real member through the actual "Add member" modal with a name filled in (`gc-name-test@example.com`, "Test Member", role viewer) and confirmed via `psql` the `name` column was populated correctly, then deleted the test user and its audit-log row. Confirmed via screenshot that both the sidebar and login page now read "by xgenious.com" instead of "Internal outreach platform." Backend: 72/72 Jest passing, `tsc --noEmit` clean on both apps.

### GC-095 — Members list: show name, not just email (2026-07-13)
Reported directly with a screenshot: the Members tab's `UsersService.findAll()` never selected the `name` column at all (`columns: { id, email, role, createdAt }`), so a name set via GC-082/093 or Profile-edit never showed up in the team list even though it was really stored. Added `name: true` to `findAll()`'s column selection. `Settings.tsx`'s member row now shows `u.name || u.email` as the primary line (bold) with the email underneath in smaller/mono text when a name is set — same two-line pattern already used on the Profile page and the top-bar dropdown, kept consistent rather than inventing a third layout. Avatar initial now derives from name first, falling back to email only when no name is set.

Verified live: reloaded Settings > Members and confirmed the real signed-in owner now shows "Sharifur Rahman" bold with "trigger-test@example.com" underneath, instead of the bare email row from before. `tsc --noEmit` clean on both apps, 72/72 Jest passing.

### GC-096 — Prevent changing your own role (2026-07-13)
Reported directly: the Members tab let an owner change *any* row's role via the dropdown, including their own — a signed-in owner could demote themselves (to editor/viewer, or in a single-owner shop, permanently locking themselves and everyone else out of owner-only actions like Settings > Integrations, audit log, and this exact Members tab). Fixed at both layers rather than only hiding the UI control, since the real risk is the API call, not the dropdown:

**Backend**: `PATCH /users/:id/role` now throws a `ForbiddenException` ("You cannot change your own role.") when the `:id` param matches the calling `@CurrentUser()`'s id — checked before calling `UsersService.updateRole()`, so there's no path (UI or direct API call) that lets a user touch their own role. Other users' roles are unaffected — an owner can still freely promote/demote anyone else.

**Frontend**: `Settings.tsx`'s Members row now compares `u.id` against the signed-in user's id (`useAuthStore`) — the current user's own row renders the same read-only role badge a non-owner sees (with a title tooltip explaining why), instead of the editable `<select>`. Every other row keeps the normal owner-editable dropdown.

Verified live: `PATCH /users/:selfId/role` via curl correctly 403s ("You cannot change your own role.") for the real signed-in owner; created a second real test user and confirmed `PATCH /users/:otherId/role` still succeeds normally (200, role updated), proving this only blocks self-changes, not the owner's ability to manage the team — cleaned up the test user afterward. In Chrome, confirmed the signed-in owner's own Members row shows a plain "owner" badge (no dropdown) while a screenshot beforehand had shown the editable select on every row including their own. `tsc --noEmit` clean on both apps, 72/72 Jest passing.

### GC-097 — CSV import rebuild: column mapping, real-time progress, invalid/duplicate counts, list/tag pick-or-create (2026-07-13)
The original CSV import (GC-012) was minimal by design: it required a column literally named `email`, silently merged any existing-email row into an "updated" bucket with no distinct duplicate count, had no way to assign the imported contacts to a List or Tags, and polled progress as a bare percentage with no live counts. Sharifur asked for all of that to be real: arbitrary column layouts via a mapping step, real-time import progress, invalid/imported/duplicate counts, and picking-or-creating a List and Tags as part of the same upload.

**Backend** (`apps/api/src/contacts/import/`): `ContactImportJobData` gained `columnMapping: Record<string, 'email'|'firstName'|'lastName'|'custom'|'ignore'>` (keyed by the same lowercased/trimmed header `csv-parse` already normalizes rows to, so lookups always match), plus optional `listId`/`tagIds`. The processor no longer hardcodes `row.email`/`row.firstname` — it resolves the actual CSV column for each target from the mapping once, then applies it per row; anything mapped to `custom` lands in the contact's existing `customFields` JSON blob keyed by its original header, since there's no fixed custom-field-definition table to map against. `ContactImportResult` now reports `created`/`duplicates`/`invalid` as three distinct exact counts (previously "duplicate" didn't exist as a concept — an existing email was silently counted as "updated"), plus a capped (500) `issues` list for the detail view — counts stay exact even past the cap. Progress is now an object (`{percent, processed, total, created, duplicates, invalid}`, not a bare number) via `job.updateProgress()`, on a cadence that scales with file size (`Math.max(1, rows.length/200)`) so a 50-row file and a 10,000-row file both get roughly 200 real progress ticks instead of one giant jump or an update-per-row flood.

List/tag association reuses the existing `ListsService`/`TagsService` schema (`contactLists`/`contactTags` join tables) but through a new bulk-import-friendly `addContactSilent()` on each service — `onConflictDoNothing()` instead of the interactive endpoints' throw-on-duplicate `addContact()`, and it accepts a pre-fetched name to avoid re-querying the list/tag name on every single row of a large import. Still emits the same `contact.list_joined`/`contact.tag_added` events as the interactive add, so triggers (GC-035) fire identically regardless of whether a contact joined a list one at a time or via a 10,000-row import. `ContactImportController` validates the list/tag ids exist (404s fast) and that the mapping actually names an `email` column before ever enqueueing the job, rather than failing deep inside the processor.

**Frontend** (`CsvImportModal.tsx`, rebuilt): four steps — pick file → map columns (a table of CSV header / sample value from the first data row / a `<select>` per column defaulting via a small heuristic — literal "email"-containing headers, `first name`/`firstname` variants, `last name`/`lastname` variants, else `custom`) → pick-or-create a List (single-select dropdown + inline "new list name" input that calls the real `createList()` and immediately selects it) and Tags (multi-select colored pills + inline "new tag name" input calling real `createTag()`) → live progress (percent bar plus running created/duplicates/invalid counts, polling every 1s with an immediate first check) → done (final counts + capped issue list). New `lib/csvPreview.ts` — a small header/first-row-only CSV line parser (quote-aware) purely for the client-side mapping UI; the authoritative full-file parse still only ever happens server-side via `csv-parse`.

Verified live at both small and large scale, not just compiled. **Small scale, through the actual browser UI**: uploaded a 4-row CSV with deliberately non-standard headers ("Contact Email", "Given Name", "Surname", "Company") containing one invalid email and one duplicate row — confirmed the mapping table auto-guessed "Contact Email"→Email correctly and left "Given Name"/"Surname" as Custom (since they don't literally say "first/last name" — exactly the case a manual mapping step exists for), manually corrected them via the selects, created a brand-new list and selected an existing tag inline, started the import, and watched the live progress bar report `4/4 rows · 2 created · 1 duplicates · 1 invalid` with the exact bad row/reason in the result — then confirmed via `psql` both new contacts had the right `firstName`/`lastName`/`customFields.company`, were in the new list, and had the tag. **Large scale, exactly as Sharifur asked ("test it with 10000 import contact")**: generated a real 10,000-row CSV (150 deliberately invalid emails, 300 deliberate duplicates of earlier rows, arbitrary column names, two custom columns) and ran it through the real `POST /contacts/import` → polled `GET /contacts/import/:jobId` to completion — finished in ~2 seconds, with exact counts `created: 9550, duplicates: 300, invalid: 150` (matching the generator's intent precisely) and correct real-time progress ticks observed mid-run (93% → 100%). Confirmed via `psql` that `contact_lists`/`contact_tags` each got exactly 9550 rows (one per distinct contact — `onConflictDoNothing` correctly deduped repeat list/tag adds when the same contact was touched by more than one row) and spot-checked `customFields` on sample rows. All test data (contacts, list, tag, temp CSV files) cleaned up afterward. Backend: 72/72 Jest passing, `tsc --noEmit` clean on both apps.

### GC-098 — "by xgenious.com" tagline is now a real link (2026-07-13)
The "by xgenious.com" tagline added in GC-094 (sidebar header, login page, About page) was plain text. Made it a real `<a href="https://xgenious.com" target="_blank" rel="noreferrer">` in all three places, consistent with the existing xgenious.com links already on the About page and in the footer.

### GC-099 — Settings notice box: green success styling (2026-07-13)
Reported directly with a screenshot: the "Saved {category}." notice shown after saving a Settings > Integrations category used a neutral `border-border-strong`/`bg-panel` style — same visual weight as an error or informational message, no indication it was a success. Changed to the same green success treatment already used elsewhere in this app (e.g. GC-077's "own AWS credentials" badge): `border-success/25 bg-success/10 text-success`, with the "Dismiss" button tinted to match.

Verified live: saved the Cloudflare R2 category and confirmed the notice now renders in green.

### GC-100 — Debug log: catch unexpected errors, new Settings tab (2026-07-13)
Sharifur asked for a debug log page that catches all errors. Built real error capture end to end rather than just a UI shell — both directions (backend and frontend), landing in one new `error_logs` table, viewable in a new Settings > Debug log tab (owner-only, matching Audit log/Integrations' existing visibility gating).

**Backend**: new `error_logs` table (`source: 'frontend'|'backend'`, `message`, `stack`, `path`, `context` jsonb, `createdAt`) and a `debug-log` module. A global `AllExceptionsFilter` (registered via `APP_FILTER`, catches everything uncaught anywhere in the app) logs to it — but deliberately **only** for genuinely unexpected errors: anything that isn't a NestJS `HttpException`, or an `HttpException` with a 5xx status. Routine `HttpException`s controllers throw on purpose (400 validation, 401/403 auth, 404 not-found, 409 conflict) pass through completely unchanged and are never logged, so the debug log stays a signal of real bugs instead of filling up with ordinary "email already exists" responses. `POST /debug-log` (the ingestion endpoint frontend errors report to) is deliberately ungated — an error can happen on the login page itself, before any token exists — while `GET /debug-log` (the paginated read used by the Settings tab) is owner-only, matching Audit log's existing gating, since stack traces can reveal internals.

**Frontend**: two capture paths feed the same endpoint. `main.tsx` registers `window.addEventListener('error', ...)` and `('unhandledrejection', ...)` for plain runtime errors and rejected promises anywhere in the app; a new `ErrorBoundary` class component (React requires a class-based boundary — `window.onerror` doesn't catch render-time errors) wraps the whole `<App/>` tree and shows a real fallback UI ("Something went wrong" + Reload button) instead of a blank white screen on an uncaught render error. Both paths call a new `reportError()` in `lib/debugLogApi.ts` — deliberately bypasses the normal `apiPost` helper and swallows its own failures, since error-reporting must never itself throw (that would recurse) and must work pre-authentication. New Settings tab lists entries with a source badge (frontend=warning color, backend=danger color, since an uncaught backend exception is a more serious signal than a frontend render glitch), message, path, and timestamp, click-to-expand for the full stack trace — same `PaginationBar`/`Page<T>` envelope pattern as Audit log/Suppression list/Email log (GC-083/084/085).

Verified live end-to-end, not just compiled: triggered a real unexpected backend error (`GET /lists/not-a-real-uuid` — a malformed UUID reaching the DB query layer, genuinely uncaught) and confirmed it landed in `error_logs` with the full real stack trace, while a routine 404 (`GET /lists/<valid-but-nonexistent-uuid>`) correctly did **not** get logged — proving the 5xx-only filter works as designed. In Chrome, opened the real Settings > Debug log tab and saw that backend error rendered with its stack trace expandable on click; then triggered a real uncaught frontend error via a thrown exception in the browser console and confirmed it appeared in the same tab tagged `frontend` with the correct page path, moments after being thrown — proving the `window.onerror` path also works live, not just in code review. Cleaned up the test log rows afterward. Backend: 72/72 Jest passing, `tsc --noEmit` clean on the API, `tsc -b` (the real build-mode check, per the lesson learned last session) clean on the web app.

Verified: `tsc --noEmit` clean on both apps, 72/72 Jest passing (no backend touched by this change).

### GC-101 — Contacts bulk delete (2026-07-13)
Requested directly with a screenshot of the existing bulk-action bar (Add to list / Enroll / Verify / Suppress). Added a fifth action. New `POST /contacts/bulk-delete` (`BulkDeleteContactsDto`: `ids: string[]`, validated `@IsUUID('4', {each:true})`) and `ContactsService.bulkRemove(ids)` — one batched `DELETE ... WHERE id IN (...)` with `.returning()` for an exact count, unlike the other three bulk actions (which each loop a per-contact endpoint client-side, since add-to-list/enroll/verify each hit a different sub-resource per contact). Cascade to `contact_tags`/`contact_lists`/`sends`/`email_events`/`sequence_enrollments` is handled entirely by the schema's existing `onDelete: 'cascade'` FKs, same as the pre-existing single-contact delete. Frontend: a red "Delete" button in the bulk-action bar opens a confirmation modal (a deliberate deviation from this app's existing zero-confirmation single-delete pattern, justified by blast radius — this can delete dozens of contacts and all their history in one irreversible call) showing the selected count and an explicit cascade warning before calling `bulkDeleteContacts()`.

Verified live: selected a test contact via checkbox, clicked Delete, confirmed the modal read "Delete 1 contact(s)?" with the cascade warning, clicked Delete, and confirmed the row disappeared with a green "Deleted 1 contact(s)." toast and the header count dropping (72 total → 71). Real contact data (`Sharifur Robin` / `dvrobin4@gmail.com`) was left untouched — confirmed still present and unaffected by the same action. Backend: 72/72 Jest passing, `tsc --noEmit` clean on API, `tsc -b` clean on web.

### GC-102 — Verify icon: Reoon status-mapping bug + spinner/toast feedback (2026-07-13)
Reported directly with a screenshot: clicking a contact's verify icon appeared to do nothing — no spinner, no result feedback, icon never changed. Root cause was NOT just missing UX — it was a real integration bug. `ReoonProvider.mapReoonStatus()` only handled a Reoon status of `'safe'` as "valid," but Reoon's quick-mode API (the mode this app calls) actually returns `'valid'` for a deliverable address; `'safe'` is a POWER-mode-only value quick mode never returns. Every real Reoon verification this app had ever performed was silently falling through to `default: unknown` and getting cached that way for 6 months (`verificationResults` cache TTL) — so re-clicking verify just replayed the same cached "unknown" instantly, explaining the "nothing happens" report exactly (a 0.03s cache hit with no UI change and no toast).

Root-caused by temporarily throwing the raw Reoon JSON response through this app's own Debug Log pipeline (GC-100) to capture it via `psql`, then reverted. Fixed `mapReoonStatus` to treat `'valid'` (and `'safe'`, kept defensively) as valid, and added `'disabled'`/`'inbox_full'` to the invalid case per Reoon's documented enum. Verified against the real API (`https://www.reoon.com/articles/api-documentation-of-reoon-email-verifier/`): quick mode's real status enum is `valid|invalid|disposable|spamtrap`.

Also fixed the reported UX gap: new `SpinnerIcon` (Tailwind `animate-spin`) renders on the verify button while a request is in flight (previously only `disabled` + dimmed opacity, no animation); a new `toast()` helper (5s auto-dismiss, tone-colored green/red/neutral) now fires on every verify outcome via a `VERIFY_TOAST` lookup keyed by result status — previously only failures showed any message at all. Icon coloring now distinguishes valid (green) / invalid (red) / risky (yellow) / not-yet-verified (gray), previously only valid-vs-everything-else.

Verified live: cleared the bad cached row for `dvrobin4@gmail.com` and re-ran verify — got a real `{"status":"valid","isDeliverable":true,"provider":"reoon","cached":false}` response, confirmed the row's icon turned green in the browser. Created a fresh never-verified test contact (`gc-verify-spinner-test@gmail.com`) specifically to observe the in-flight state (a cached email resolves too fast, ~30ms, to see any spinner) — screenshotted mid-click and confirmed the `SpinnerIcon` renders in place of the checkmark while the request is pending, then confirmed the green "Verified — deliverable." toast renders after resolution. Test contact deleted afterward via the new GC-101 bulk-delete UI (also served as a live end-to-end test of that feature). Backend: 72/72 Jest passing, `tsc --noEmit` clean on API, `tsc -b` clean on web.

### GC-103 — Verify status: distinct icon shapes, icon+tooltip in toast (2026-07-13)
Follow-up once Sharifur added a real Reoon key: GC-102's icon differentiation was color-only (every status rendered the same checkmark glyph, just tinted green/red/yellow/gray) — a gray checkmark for "never verified" reads as a faded success, not "unknown." Asked to rank status properly and make the toast itself carry a recognizable status signal, not just tone-colored text.

Added four shared icons to `components/icons.tsx` (`CheckCircleIcon`, `XCircleIcon`, `AlertTriangleIcon`, `HelpCircleIcon`, same stroke-icon style as the existing set). The per-row verify button now renders a distinct shape per status — check-circle (valid), x-circle (invalid), triangle (risky), question-mark circle (unverified/never-checked) — instead of one glyph with four colors. Title tooltip also gained an explicit `unknown` branch ("Verified — inconclusive, click to re-check"), previously folded into the same text as never-verified.

Toast now carries the same icon: `notice` state gained an optional `icon?: ReactNode`, `toast()` takes it as a third arg, and a new `VERIFY_ICON` lookup (mirroring `VERIFY_TOAST`) passes the matching icon from `handleVerify`. The notice bar renders the icon inline before the text with a `title` tooltip repeating the message, so the result is readable from the icon alone without reading the sentence.

Verified live with the real Reoon key now configured (previously only local-filter fallback was exercised): created `gc-verify-rank-valid@gmail.com` (real Gmail, real Reoon call → `valid`) and `gc-verify-rank-invalid@nonexistent-domain-xyz-987654321.com` (bad domain → local pre-filter `invalid`, confirming the local-check-before-Reoon order still short-circuits correctly) via the real API, then loaded them in the browser — confirmed the green check-circle (valid), red x-circle (invalid), and gray question-mark (five never-verified rows: D, Contact5, Contact4, Contact3, Contact2) all render as visually distinct shapes side by side, not just distinct colors. Created a third fresh contact (`gc-toast-icon-test@gmail.com`), clicked verify, and confirmed the toast rendered the green check-circle icon inline next to "Verified — deliverable." All three test contacts deleted afterward via the bulk-delete API (also re-exercised GC-101 live). Backend: 72/72 Jest passing, `tsc --noEmit` clean on API, `tsc -b` clean on web.

### GC-104 — Bulk-verify: safety limit param, fix missing live progress bar (2026-07-13)
Asked to confirm bulk-verify (GC-062/GC-088) actually works and shows real-time progress, capped to 5 emails on only-unverified contacts since a real Reoon key is now configured — a "does this work" test, not a feature request, but testing it safely required two small fixes since the feature as it stood couldn't be tested at a capped scale and its progress wasn't visible anyway.

**No cap existed**: `POST /verification/bulk-verify` always enqueued a job against every active+unverified contact (`VerificationStatsService.listUnverifiedActiveContacts()`, no limit) — the real DB had 35 such contacts, so testing "as-is" would have spent 35 real Reoon calls to answer a yes/no question. Added an optional `limit` on a new `BulkVerifyDto` (`@IsOptional() @IsInt() @Min(1)`, `class-transformer`'s `@Type(() => Number)` since the global `ValidationPipe` already runs with `transform: true`), threaded through the job payload (`{ limit: dto.limit }`) to `BulkVerifyProcessor`, which now does `job.data?.limit ? all.slice(0, job.data.limit) : all` — `undefined` preserves the exact prior unlimited behavior, so the existing frontend call (`startBulkVerify()`, no body) is unaffected. The frontend UI doesn't expose this param — it's a safety knob for scripted/API-level testing, not a new user-facing control (out of scope for this ask).

**Live progress wasn't rendered**: `Verification.tsx` already received `job.progress` (a real 0-100 percent from `job.updateProgress()` in the processor) but only ever displayed the literal BullMQ state string ("Running… (active)") — the actual percent was fetched and silently dropped. Added a percent readout plus a filled progress bar (same visual language as the CSV import modal's progress bar) that renders while a job isn't yet completed/failed.

Verified live via the real API (deliberately not the browser "Bulk verify" button, since it has no limit control and would have spent real Reoon credits verifying all 65 remaining unverified contacts): logged in for a real JWT, `POST /verification/bulk-verify` with `{"limit":5}`, then polled `GET /verification/bulk-verify/:jobId` every second — watched real progress `0% → 20% → 100%` and a final `{"totalContacts":5,"checked":5,"failed":0}`. Confirmed via `psql` exactly 4 of the 5 got a real cached `valid` result from Reoon (`jordan.thomas461@stark.io`, `taylor.patel358@globex.io`, `taylor.nguyen939@wayne.enterprises`, `harper.lewis999@initech.com`) while the 5th failed the free local syntax/MX pre-filter and correctly never reached Reoon or the cache table (existing, correct `email-verification.service.ts` behavior — local-invalid short-circuits before caching, so it's picked up again on a future bulk-verify run rather than being wrongly cached). `/verification/stats` confirmed a real `unverified 69 → 65` drop. No test contacts were created or needed — this ran against real, pre-existing unverified contacts already in the dev DB, and verifying them is the intended product behavior, not test pollution requiring cleanup. Backend: 72/72 Jest passing, `tsc --noEmit` clean on API, `tsc -b` clean on web.

### GC-105 — Template editor toolbar: full basic formatting set + CTA button (2026-07-13)
Asked to expand the template editor toolbar with the basics an email campaign needs: bold, italic, link, image, numbered list, bullet list, and a button element, plus "a few other basic options often needed." Bold/italic/link/image already existed (GC-015/GC-053-adjacent); everything else was missing from the toolbar even though most of the underlying TipTap nodes were already silently available in the document schema via `StarterKit` (v3 bundles blockquote, horizontal rule, heading, bullet/ordered list, strike, underline, and undo/redo by default — confirmed by reading `@tiptap/starter-kit`'s type definitions rather than assuming) — this was purely a missing-toolbar-button problem for those, not a missing-extension problem. Only text alignment (`@tiptap/extension-text-align@3.27.3`, matching the existing v3 pin) and the CTA button needed new code.

**New toolbar** (`TemplateEditorToolbar.tsx`, full rewrite): Undo/Redo, a paragraph-style `<select>` (Normal/H1/H2/H3), Bold/Italic/Underline/Strikethrough, Align left/center/right, Bulleted list/Numbered list/Quote/Divider, then the existing Link/Image/new-Button/Spintax/Insert-token/AI-Assist group — organized into dividered clusters matching the design file's toolbar layout (`docs/design/geniusCampaign.dc.html` lines 671-701, which specifies a `flex-wrap` toolbar with a generic button-count placeholder plus explicit Link/Bulleted-list/Image buttons — the exact glyph set beyond that wasn't dictated, so the added basics were chosen for what an email campaign toolbar typically needs). Added 16 new stroke-style SVG icons to `components/icons.tsx` matching the existing icon language, replacing the two prior emoji glyphs (🔗/🖼) for visual consistency across the now-much-larger toolbar.

**New `CtaButton` node** (`lib/tiptap/cta-button.tsx`, modeled directly on the existing `SpintaxBlock` custom-node pattern): a block atom node with `text`/`href` attrs, rendered via a `ReactNodeViewRenderer` as a real accent-colored button in the editor; clicking it opens the same two-`window.prompt()` edit flow the existing Link button already uses (text, then URL) rather than inventing a new interaction pattern. `renderHTML` outputs the button as a real `<a>` tag with inline styles (`display:inline-block;padding:...;background:#6366F1;...`) — inline styles because most mail clients strip `<style>` blocks and CSS classes, so a button that only worked via a stylesheet would render as unstyled fallback text in an actual inbox.

**Found and fixed a real correctness gap while wiring this up, not just a UI addition**: `packages/shared/src/render-body.ts` (the server-side ProseMirror-JSON-to-HTML/-text renderer used both for the live send pipeline and the shuffle preview — invariant 5's "resolve once, store the resolved result" renderer) only had cases for `bold`/`italic`/`link` marks and `paragraph`/`heading`/`bulletList`/`orderedList`/`listItem`/`hardBreak`/`text` nodes. `image`, `blockquote`, and `horizontalRule` nodes had no case (falling through to the generic default, which for atom nodes with no `content` array silently produces an empty string), and `underline`/`strike` marks had no case in `applyMarks` at all. This meant **any image, blockquote, divider, underline, or strikethrough already used in an existing template would silently vanish from the actual sent email** while still showing correctly in the editor — a real, pre-existing bug this ticket's toolbar expansion would have made much more visible (adding toolbar buttons for underline/strike/blockquote/divider/button without also teaching the renderer about them would have shipped a toolbar that visibly lies about what recipients receive). Added all five: `image`→`<img src alt>`, `blockquote`→wrapped `<blockquote>`, `horizontalRule`→`<hr>`, `underline`→`<u>`, `strike`→`<s>`, plus the new `ctaButton`→styled `<a>` and a `textAlign` attr→inline `style="text-align:..."` on paragraph/heading. Mirrored the same additions in `renderNodeText` (the plain-text part) for the analogous multipart alternative. `EditorContent`'s Tailwind classes in `TemplateEditor.tsx` also needed explicit `list-disc`/`list-decimal`/border/heading-size utilities, since this app has no `@tailwindcss/typography` plugin — Tailwind's preflight reset strips default browser list/heading styling, so without these the lists and headings would render with no visual distinction at all despite being structurally correct.

Verified live end-to-end, not just compiled: rebuilt `@genius-campaign/shared` and restarted the API dev server (Node caches workspace-package `dist` output at process start, so a running server doesn't pick up a rebuilt shared package without a restart). In the real browser template editor: typed and selected text, applied Bold+Italic+Underline+Align-center via toolbar clicks and confirmed all four rendered together correctly; toggled a two-item list between bulleted (`•`) and numbered (`1. 2.`) and confirmed the marker style actually switched; applied Blockquote and confirmed the left-border/italic/muted styling rendered; inserted a Divider and confirmed the `<hr>` line rendered. For the CTA button and Link buttons specifically, clicking them in real browser automation would trigger a native `window.prompt()` dialog — blocking and unrecoverable per this session's browser-automation safety constraints — so instead reached the live TipTap `Editor` instance through its React fiber (`.ProseMirror`'s parent element's `memoizedProps.editor`) and called `insertCtaButton({text, href})` directly, which exercises the identical extension/command code the toolbar button would call, just without the prompt dialogs. Confirmed the button rendered as a real accent-colored button in the editor. Saved the template as a real API record, then fetched it back and confirmed `bodyJson` stored the `ctaButton` node with its real attrs and — critically — `bodyHtml` (the exact field the send pipeline uses) contained the real inline-styled `<a href="https://example.com/sale" style="...">Shop the sale</a>`, proving the fix closes the loop from editor to actual outbound email HTML. `bodyText` also rendered sensibly (`"Shop the sale: https://example.com/sale"`). Test template deleted afterward via the real API. Backend: 72/72 Jest passing, `tsc --noEmit` clean on API, `tsc -b` clean on web, shared package builds clean.

### GC-106 — Prebuilt email template library + fix window.prompt-based editor dialogs (2026-07-13)
Imported the "Email Library" Claude Design project (`https://claude.ai/design/p/c4ff1030-c9ae-4e52-b790-d88123c2bec3`) via the `DesignSync` MCP tool (`/design-login` authorized design-system scopes first) and implemented its 6 templates as a "start from template" picker in the template editor.

**Import, not pixel copy**: the design project's `emails/*.html` files are full bulletproof HTML-table emails (MSO conditionals, inline styles, `role="presentation"` tables) — this app stores templates as ProseMirror JSON (`bodyJson`), not raw HTML, so importing meant rebuilding each template's actual content and intent using this editor's own node vocabulary (paragraphs, ordered/bullet lists, bold, the GC-105 `CtaButton` node, personalization tokens) rather than copying table markup that the editor schema can't represent and the renderer can't emit. New `apps/web/src/lib/emailTemplateLibrary.ts` — a static array built from the manifest's 6 canonical templates (`plain-01` through `plain-06`; the manifest was the source of truth over a few extra orphaned draft files in the same folder not referenced by it). Each template's recipient name ("Alex" in the source) was mapped to the real `{{contact.firstName}}` personalization token — the one clear integration point with this app's existing token system — while the rest of the founder/SaaS copy was kept close to the source as genuinely useful, editable starter copy rather than being genericized into placeholder lorem text. The source's single "→" CTA links became real `ctaButton` nodes, directly exercising GC-105's new feature. The one template with a header product-screenshot placeholder (`plain-06-announce`) omits the image node entirely rather than faking one — invariant 6 requires real R2-uploaded image URLs, and there's no real asset to seed one with; the user adds their own via the real upload flow.

New `TemplateLibraryModal.tsx` shown automatically when opening `/templates/new` (skippable via "Skip, start blank") — a 2-column card grid (name, description, subject line preview) that populates the editor's name/subject/content via `editor.commands.setContent()` on pick, exactly like loading an existing template does.

**Mid-task fix, explicitly requested**: "use dialog instead of browser based alert for button insert" — GC-105's Link toolbar button and the new CTA Button toolbar button + its in-place edit-on-click both used `window.prompt()` (2 sequential prompts for the button, since it needs both text and URL). Native prompts block all page events including this session's own browser-automation testing, can't be styled, and are a poor UX pattern generally. New shared `components/PromptDialog.tsx` (small in-app modal, N configurable text fields, Cancel/Submit/optional Remove, Enter-to-submit/Escape-to-close) replaces all three call sites: the toolbar's Link button (1 field, pre-filled with the current link's URL when editing, gains a "Remove" action previously only reachable by clearing the prompt), the toolbar's Button-insert (2 fields), and `CtaButtonView`'s click-to-edit flow in `lib/tiptap/cta-button.tsx` (2 fields, pre-filled with the button's current text/URL).

**Infra note, not a code bug**: mid-verification, the API's committed dev port (3001, root `.env`) was found occupied by an unrelated already-running project (`taskip-ai-agent`, a different repo entirely) — this repo's own API dev process had apparently died earlier in the session and the other project's process took the freed port. Rather than kill a process outside this repo's control, verified via a temporary port override (3002, both `PORT` and `VITE_API_BASE_URL` in root `.env`) for this session's testing only, then reverted `.env` back to the committed `3001` defaults afterward — the port conflict itself is a machine-level coincidence for the user to resolve, not something to silently work around by permanently repointing this repo's checked-in dev config.

Verified live end-to-end: opened `/templates/new`, confirmed all 6 cards render with correct name/description/subject; picked "Getting started guide" and confirmed the editor populated with the real token, bold-lead-in numbered list, and a working `ctaButton` rendered as an actual button (not source markup); confirmed the redesigned Link and Button toolbar buttons open the new in-app dialog (screenshotted) instead of a native prompt, including the Link dialog correctly pre-filling the current URL and the Button node's click-to-edit dialog correctly pre-filling its existing text/URL. Saved the picked template as a real API record, fetched it back, and confirmed `bodyHtml` correctly contains the rendered `<ol>`/`<strong>`/button markup — proving the library template survives the exact same editor→save→send-HTML path as manually authored content. Test template deleted afterward. Backend: 72/72 Jest passing, `tsc --noEmit` clean on API, `tsc -b` clean on web, shared package builds clean.

### GC-107 — Template editor: cross-client/responsive preview + real send-test (2026-07-13)
Asked for two things on the template detail page: a preview of how the email looks across different inbox clients and screen sizes, and a way to send a real test email so the user can see the actual result in their own inbox.

**Preview** (`TemplatePreviewModal.tsx`): client-side, no API call. Reuses `renderBodyHtml`/`resolvePersonalization`/`resolveSpintax` from `@genius-campaign/shared` against a sample contact (`Alex Doe`) to resolve the exact HTML the send pipeline would produce, then renders it inside a sandboxed `<iframe srcDoc>` wrapped in one of three simulated inbox-chrome headers (Gmail/Outlook/Apple Mail — each its own real color/font/avatar treatment matching that client's actual look) at one of two widths (Desktop 640px / Mobile 375px). Honest scope: this simulates the surrounding inbox chrome and responsive width genuinely, but doesn't emulate real per-client CSS-support differences (e.g. Outlook's actual Word-based rendering engine stripping certain CSS) — that requires a paid third-party rendering service (Litmus/Email on Acid), out of scope for an internal tool; the body content itself is identical across tabs, which is honestly what the app can promise without one.

**Send test** (`SendTestEmailModal.tsx` + `POST /templates/send-test`): sends real, unsaved editor content (not requiring a save first) to an address the user types, defaulting to their own logged-in email. Backend (`TemplatesService.sendTestEmail`) resolves personalization against sample data (same `Alex Doe` placeholder as the preview) then spintax — same order as every other send path (invariant 5) — and calls `SendDispatcherService.send()` directly, the same low-level entry point `campaign-send.processor.ts` uses, subject prefixed `[Test]`. Deliberately writes no `sends` row (that table's `contactId` is `NOT NULL` with a real FK — a test send has no real contact to attach to) and skips `SuppressionService` entirely (this isn't a send to a contact, it's an ad-hoc QA action against an address the authenticated caller explicitly chose) — but still goes through the real circuit breaker and real sender-account quota via `SendDispatcherService`, so it can't be used to bypass either safety mechanism. New `SendTestEmailDto` (`to`/`subject`/`bodyHtml`/`bodyText`), wired `SendingModule` into `TemplatesModule` to reach `SendDispatcherService`, audit-logged via the existing `AuditLogService` pattern (`template.send_test`, entity id = recipient address).

**Refactor along the way**: `resolvePersonalization` lived only in `apps/api/src/sequence-runner/personalize.util.ts`, but the new client-side preview needed the identical resolution logic to accurately predict what a real send/test-send would produce. Moved it into `packages/shared/src/personalize.ts` (now exported alongside `resolveSpintax`/`renderBodyHtml`) rather than duplicating the regex in the frontend — single source of truth for personalization resolution across backend send paths and the frontend preview, avoiding exactly the kind of resolution-order drift CLAUDE.md's invariant 5 warns about. Updated the two existing callers (`sequence-runner.service.ts`, `campaign-send.processor.ts`) to import from `@genius-campaign/shared` instead of the old local file, which was deleted.

**Infra note**: mid-verification the dev API (temporarily repointed to port 3002 per GC-106's port-conflict workaround) crashed again — `nest --watch`'s file-triggered restart re-read root `.env`, which had been reverted back to the committed `PORT=3001` after GC-106, and the unrelated `taskip-ai-agent` process was still holding 3001. Re-pinned `.env` to `3002` for the rest of this session (rather than repeatedly reverting into a guaranteed crash on every watch-triggered restart) — worth resolving properly next session by either stopping that other process or deciding on a permanent port for this repo.

Verified live end-to-end: opened a real template (Case Study Share), clicked Preview and confirmed all three client-chrome tabs (Gmail/Outlook/Apple Mail) render with genuinely distinct, correct styling and confirmed Desktop→Mobile visibly narrows the simulated device frame to 375px. Clicked Send test, confirmed the dialog pre-fills the logged-in user's own email, clicked Send, and got a real `403 Circuit breaker is tripped` error rendered cleanly in the modal — proving the request reached the actual `SendDispatcherService` (not a stub) and that the real safety guard still applies to test sends, without sending an actual email (the breaker was already tripped from real dev-testing send volume earlier in this session, not something I reset — resetting it is an owner action with real consequences, out of scope for this ticket). Backend: 72/72 Jest passing, `tsc --noEmit` clean on API, `tsc -b` clean on web, shared package builds clean.
