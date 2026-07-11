# Ticket backlog

Status values: `Not Started` / `In Progress` / `Done` / `Blocked`. Update the table row and the ticket's own status line together.

## Master list

| ID | Title | Sprint | Size | Status | Depends on |
|---|---|---|---|---|---|
| GC-001 | Monorepo scaffolding (npm workspaces) | 0 | S | Done | — |
| GC-002 | Create local PostgreSQL database | 0 | S | Done | — |
| GC-003 | Verify local Redis connectivity | 0 | S | Done | — |
| GC-004 | Drizzle baseline schema + first migration | 0 | S | Done | GC-001, GC-002 |
| GC-005 | NestJS app bootstrap | 0 | S | Not Started | GC-001, GC-004 |
| GC-006 | React app bootstrap (Vite + TS + Tailwind + Zustand) | 0 | S | Not Started | GC-001 |
| GC-007 | Root dev scripts (no Docker) | 0 | S | Not Started | GC-005, GC-006 |
| GC-008 | Consolidated .env.example | 0 | S | Not Started | GC-005 |
| GC-010 | Contacts schema + CRUD API | 1 | M | Not Started | GC-004 |
| GC-011 | Lists + tags schema + CRUD API | 1 | M | Not Started | GC-010 |
| GC-012 | CSV contact import (queued) | 1 | M | Not Started | GC-010, GC-011 |
| GC-013 | Templates schema + CRUD API | 1 | M | Not Started | GC-004 |
| GC-014 | TipTap editor base integration | 1 | M | Not Started | GC-013, GC-006 |
| GC-015 | R2 image upload in editor | 1 | M | Not Started | GC-014 |
| GC-016 | Spintax spinBlock extension + resolver | 1 | M | Not Started | GC-014 |
| GC-017 | AWS SES sending service | 1 | M | Not Started | GC-013 |
| GC-018 | SES bounce/complaint pipeline + suppression list | 1 | M | Not Started | GC-017 |
| GC-019 | Open + click tracking | 1 | M | Not Started | GC-017 |
| GC-020 | One-off campaign send flow | 1 | L | Not Started | GC-011, GC-016, GC-017, GC-018, GC-019 |
| GC-021 | Admin UI: contacts, templates, send campaign | 1 | L | Not Started | GC-020 |
| GC-030 | Sequences + steps schema + CRUD API | 2 | M | Not Started | GC-013 |
| GC-031 | EnrollmentService (enroll/pause/resume/stop) | 2 | M | Not Started | GC-030, GC-010 |
| GC-032 | Sequence runner (BullMQ processor) | 2 | L | Not Started | GC-031, GC-020 |
| GC-033 | Admin UI: sequence builder | 2 | M | Not Started | GC-030, GC-021 |
| GC-034 | Admin UI: contact enrollment panel | 2 | S | Not Started | GC-031, GC-021 |
| GC-035 | Condition-based trigger engine | 2 | L | Not Started | GC-031 |
| GC-036 | Schedule-based trigger (BullMQ repeatable) | 2 | M | Not Started | GC-032 |
| GC-037 | Internal event bus wiring | 2 | M | Not Started | GC-035 |
| GC-040 | Inbound webhook framework (HMAC) | 3 | M | Not Started | GC-010 |
| GC-041 | Sequence webhook controller | 3 | S | Not Started | GC-040, GC-031 |
| GC-042 | Admin enrollment controller | 3 | S | Not Started | GC-031, GC-034 |
| GC-043 | Outbound webhook dispatcher | 3 | M | Not Started | GC-037 |
| GC-044 | Gmail OAuth connect flow | 3 | M | Not Started | GC-005 |
| GC-045 | SendDispatcherService (SES + Gmail rotation) | 3 | M | Not Started | GC-044, GC-017 |
| GC-046 | Gmail bounce scanner (DSN polling) | 3 | M | Not Started | GC-044, GC-018 |
| GC-047 | Admin UI: sender accounts | 3 | S | Not Started | GC-044, GC-021 |
| GC-048 | Local verification pre-filter | 3 | S | Not Started | GC-010 |
| GC-049 | Reoon + NeverBounce verification integration | 3 | M | Not Started | GC-048 |
| GC-050 | Bounce-rate circuit breaker | 4 | M | Not Started | GC-018, GC-032 |
| GC-051 | Slack notifications | 4 | S | Not Started | GC-050 |
| GC-052 | Dry-run / send-to-self mode | 4 | S | Not Started | GC-020, GC-032 |
| GC-053 | Pre-send confirmation summary | 4 | S | Not Started | GC-020 |
| GC-054 | Spintax resolved-preview UI | 4 | S | Not Started | GC-016 |
| GC-055 | Image compression + EXIF stripping | 4 | S | Not Started | GC-015 |
| GC-056 | Lightweight RBAC | 4 | M | Not Started | GC-005 |
| GC-057 | Audit log | 4 | M | Not Started | GC-056 |
| GC-058 | Analytics dashboard | 4 | L | Not Started | GC-019, GC-032 |
| GC-059 | AI-assisted template copy | 4 | M | Blocked (needs decision) | GC-014 |
| GC-060 | Email log UI (all sends, filterable, detail drawer) | 4 | M | Not Started | GC-019, GC-020 |

---

## Design reference map

`docs/design/geniusCampaign.dc.html` has the exact layout/copy/interaction spec for these screens — check the matching section (grep the comment marker) before marking the corresponding ticket done:

| Ticket | Design section |
|---|---|
| GC-021 (contacts UI) | `CONTACTS`, `CONTACT DETAIL`, `CSV IMPORT MODAL` |
| GC-021 (templates UI) / GC-014 / GC-015 / GC-016 | `TEMPLATES`, `TEMPLATE EDITOR`, `SPINTAX EDIT MODAL` |
| GC-021 (send flow) / GC-020 | `CAMPAIGNS LIST`, `CAMPAIGN COMPOSE`, `CAMPAIGN DETAIL` |
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

### GC-015 — R2 image upload in editor
Import the R2 reference implementation (see `CLAUDE.md`): presign endpoint, `R2Image` TipTap extension, upload placeholder, toolbar button.
**Acceptance criteria:**
- Pasting/dropping/inserting an image results in an R2 URL in the saved template, never a base64 data URI.
- R2 bucket CORS is configured per the reference implementation's README; direct browser-to-R2 upload works.

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

### GC-018 — SES bounce/complaint pipeline + suppression list
SES configuration set → SNS topic → SQS queue → NestJS consumer. `SuppressionList` table. Every send checks suppression first and skips (logging why) rather than sending.
**Acceptance criteria:**
- A deliberately-bounced test address (SES has mailbox simulator addresses for this) ends up in the suppression list automatically.
- Attempting to send to a suppressed address is blocked before it reaches SES, not after.

### GC-019 — Open + click tracking
Tracking subdomain, 1×1 pixel endpoint, link-rewriting + redirect endpoint, `EmailEvent` table.
**Acceptance criteria:**
- Opening a sent test email in a real client records an open event.
- Clicking a link in a sent test email records a click event and correctly redirects to the original URL.
- Tracking pixel/links use signed tokens, not raw sequential send IDs.

### GC-020 — One-off campaign send flow
Ties GC-011/016/017/018/019 together: pick a template + a list, resolve spintax per recipient, check suppression, send via SES, record the resolved subject/body on the `Send` row per the spintax-resolution invariant in `CLAUDE.md`.
**Acceptance criteria:**
- Sending a campaign to a 5-contact test list produces 5 distinct (or at least independently-resolved) spintax variants if the template uses spintax.
- Every `Send` row has its fully-resolved subject/body stored, independent of what the template looks like now.

### GC-021 — Admin UI: contacts, templates, send campaign
React screens: contacts list/detail/import, template list/editor (GC-014/015/016 wired in), and a "send campaign" flow (pick template, pick list, confirm, send).
**Acceptance criteria:**
- An admin can go from "no contacts" to "sent campaign" entirely through the UI, no direct API calls needed.

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

### GC-032 — Sequence runner (BullMQ processor)
Import the reference implementation. Wire up the repeatable job, connect to `SendDispatcherService` (stub is fine until GC-045 lands; can call `SesSenderProvider` directly for now).
**Acceptance criteria:**
- A 3-step sequence with short test delays (minutes, not days) runs end-to-end against a test contact.
- Pausing mid-sequence (via direct service call, webhook lands in GC-041) stops further sends within one runner tick.

### GC-033 — Admin UI: sequence builder
Visual step editor: add/remove/reorder steps, pick template per step, set delay.
**Acceptance criteria:**
- Building and saving a 3-step sequence through the UI produces the same DB state as building it via direct API calls.

### GC-034 — Admin UI: contact enrollment panel
Import `ContactEnrollments.tsx` reference implementation onto the contact detail page.
**Acceptance criteria:**
- Pause/resume/stop buttons work against a real enrollment and reflect status changes without a manual page refresh.

### GC-035 — Condition-based trigger engine
`Trigger` + `TriggerCondition` schema, JSON-logic-style evaluator (`equals/contains/gt/lt/in/exists`, AND/OR groups), evaluation worker triggered off internal events.
**Acceptance criteria:**
- A trigger configured for "tag X added" correctly enrolls a contact into the linked sequence when that tag is added, and does not fire for unrelated field changes.
- Evaluator has test coverage for at least each supported operator.

### GC-036 — Schedule-based trigger (BullMQ repeatable)
Recurring trigger evaluation (cron-style) plus one-off scheduled campaign sends, timezone-aware.
**Acceptance criteria:**
- A "every Monday 9am" recurring trigger fires correctly across a simulated multi-week test.
- A one-off scheduled campaign set for a specific future timestamp in a specific timezone sends at the correct wall-clock time in that timezone.

### GC-037 — Internal event bus wiring
Wire `EventEmitter2` (or chosen equivalent) emissions into contact/list/tag mutation points: `contact.created`, `contact.tag_added`, `contact.field_changed`, `contact.list_joined`, plus the email events from GC-019 (`email.opened`, `email.clicked`, `email.bounced`).
**Acceptance criteria:**
- Every event type GC-035's trigger engine depends on is actually emitted somewhere in the codebase — cross-check against the trigger engine's supported `event_type` values.

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

### GC-042 — Admin enrollment controller
Import the reference implementation: JWT-authenticated equivalent of GC-041 for the admin UI (GC-034) to call.
**Acceptance criteria:**
- Produces identical `SequenceEnrollment` state changes to GC-041 for the same logical action.

### GC-043 — Outbound webhook dispatcher
Let external systems subscribe to internal events (open/click/bounce/sequence-completed/etc.) via a registered outbound webhook URL, with retry/backoff on delivery failure.
**Acceptance criteria:**
- A test receiving endpoint (e.g. a local ngrok tunnel or webhook.site) gets a correctly-formed payload when a subscribed event fires.
- A failing receiver gets retried with backoff, not hammered or silently dropped after one attempt.

### GC-044 — Gmail OAuth connect flow
Import the reference implementation: Google Cloud OAuth client setup (Internal user type), `/sender-accounts/gmail/connect` + `/callback`, encrypted refresh token storage.
**Acceptance criteria:**
- Connecting a real Gmail Workspace test mailbox succeeds and stores an encrypted refresh token.
- Reconnecting the same mailbox updates rather than duplicates its `SenderAccount` row.

### GC-045 — SendDispatcherService (SES + Gmail rotation)
Import the reference implementation: `SenderAccountService.pickAccountForSend()`, `EmailSenderProvider` interface, `SendDispatcherService`. Wire GC-032's runner and GC-020's campaign flow to go through this instead of calling SES directly.
**Acceptance criteria:**
- With one Gmail account and SES both active, sends alternate based on quota headroom, verifiable by inspecting `sentToday` on each `SenderAccount` after a batch of test sends.
- Exhausting a Gmail account's daily quota causes subsequent sends to route to SES (or another Gmail account) automatically, not to error out.

### GC-046 — Gmail bounce scanner (DSN polling)
Import the reference implementation: 15-minute inbox-poll job, DSN parsing.
**Acceptance criteria:**
- A deliberately-bounced test send from a connected Gmail account is detected within one poll cycle and logged (feeding into the suppression list per the "soft signal" note in `CLAUDE.md`).

### GC-047 — Admin UI: sender accounts
Import the reference implementation: `SenderAccountsSettings.tsx`, quota bars, connect button.
**Acceptance criteria:**
- Shows live `sentToday`/`dailySendLimit` for every connected account, matching the DB state.

### GC-048 — Local verification pre-filter
Syntax regex, MX record lookup (`dns.resolveMx`), disposable-domain blocklist check — all before any paid API call.
**Acceptance criteria:**
- A syntactically invalid address, a domain with no MX record, and a known disposable-domain address are all rejected without any external API call being made (verify via request logging/mocking in a test).

### GC-049 — Reoon + NeverBounce verification integration
Paid-API step for addresses that pass GC-048, cached in `VerificationResult` with a 6–12 month TTL. Reoon primary, NeverBounce fallback behind the same interface.
**Acceptance criteria:**
- Verifying the same address twice within the TTL window makes only one external API call, confirmed via request count.
- Reoon being unavailable (mocked failure) correctly falls back to NeverBounce rather than failing the whole verification.

---

## Sprint 4 — Safety net & polish

### GC-050 — Bounce-rate circuit breaker
Rolling-window bounce/complaint rate check (e.g. last 500 sends). Crossing a threshold auto-pauses active sequences/campaigns and flags for review.
**Acceptance criteria:**
- A simulated burst of bounces in a test run trips the breaker and verifiably pauses active sends within one evaluation cycle.
- Breaker state and threshold are configurable, not hardcoded.

### GC-051 — Slack notifications
Webhook-based Slack alerts for: circuit breaker tripped, campaign finished, verification credits low, large-send confirmation (ties to GC-053).
**Acceptance criteria:**
- Each event type produces a distinct, readable Slack message, not a generic "something happened."

### GC-052 — Dry-run / send-to-self mode
Flag on campaign/sequence sends that renders the final resolved email but routes to a fixed internal test list (or just logs it) instead of real contacts.
**Acceptance criteria:**
- Dry-run mode never touches `SenderAccount.sentToday` counters or real contacts, verified by checking those are unchanged after a dry run.

### GC-053 — Pre-send confirmation summary
UI + API check: sends above a configurable recipient threshold require an explicit confirm step showing recipient count, list, and template name.
**Acceptance criteria:**
- Attempting to send above the threshold without confirmation is blocked server-side, not just hidden client-side.

### GC-054 — Spintax resolved-preview UI
"Shuffle" button in the template editor showing a few random resolved variants side by side.
**Acceptance criteria:**
- Clicking shuffle re-resolves and displays a new set of variants without a full page reload.

### GC-055 — Image compression + EXIF stripping
Client-side resize/re-encode and EXIF strip before upload to R2.
**Acceptance criteria:**
- A large (>2MB) test photo with EXIF GPS data results in a smaller, EXIF-stripped file in R2 — verify by inspecting the uploaded object's metadata.

### GC-056 — Lightweight RBAC
`owner | editor | viewer` role on templates/sequences/lists.
**Acceptance criteria:**
- A `viewer`-role test user can be verified (via API test) unable to save changes, while able to read.

### GC-057 — Audit log
Record who changed a template, paused a sequence, exported a list, etc.
**Acceptance criteria:**
- Every mutation covered by GC-056's RBAC check also produces an audit log entry with actor, action, and timestamp.

### GC-058 — Analytics dashboard
Open/click/bounce rates per campaign and sequence, basic trend view. Design: `DASHBOARD` section.
**Acceptance criteria:**
- Dashboard numbers match a manual `SELECT count(*)`-style spot check against `EmailEvent`/`Send` tables for at least one real test campaign.

### GC-059 — AI-assisted template copy
Surfaced by the design's `AI ASSIST MODAL` — a prompt-to-copy tool inside the template editor (write a brief, get generated subject/body copy, optionally refine with quick actions like "make it shorter," insert into the editor). **Blocked**: needs a decision on LLM provider (Anthropic or OpenAI) and a real API key from Sharifur before this can start — do not stub this with a fake/mocked response and mark it done, and do not pick a provider unilaterally.
**Acceptance criteria (once unblocked):**
- Generated copy is inserted into the editor as plain resolvable content — it doesn't bypass the spintax/personalization-token system from GC-016.
- API key is read from env (never hardcoded), and the modal clearly labels output as AI-generated per the design's footer copy ("AI-generated · review before sending").
- A missing/invalid API key produces a clear in-modal error, not a silent failure or a crash.

### GC-060 — Email log UI
All-sends log (not the aggregate dashboard from GC-058 — this is the raw per-send list): status, recipient, template, timestamp, filterable, with a detail drawer showing the specific resolved subject/body and event history for one send. Design: `EMAIL LOG`, `EMAIL LOG DETAIL DRAWER`.
**Acceptance criteria:**
- Every row is backed by a real `Send` row — clicking into the detail drawer shows the actual resolved (post-spintax) subject/body stored on that row, not the live template.
- Filterable by at least status (sent/opened/clicked/bounced) and by campaign/sequence.
