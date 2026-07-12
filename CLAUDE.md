# geniusCampaign

In-house email marketing / outreach platform. Internal tool only — not a resold product, single organization, no multi-tenancy.

This file is project memory for any Claude Code session working in this repo. Read it before making architectural decisions; update it when a decision changes. `docs/SPRINT_PLAN.md` and `docs/TICKETS.md` track what to build and in what order — this file is about how the system is designed and how to work in it.

## Status

Planning complete, design imported, implementation not started. Sprint 0 (project setup) is the next work. See `docs/SPRINT_PLAN.md` for the full roadmap and `docs/TICKETS.md` for the ticket backlog. As of now, work proceeds in **autonomous mode** — see that section below before starting any ticket.

## Design

`docs/design/geniusCampaign.dc.html` is the imported, approved visual design (dark theme, Geist font, dense B2B admin aesthetic — 18 screens + 6 modals covering essentially the whole app). `docs/design/README.md` explains the file format and how to navigate it; `docs/design/DESIGN_TOKENS.md` is the exact Tailwind config to use, extracted from the design — GC-006 should use it verbatim rather than picking colors independently.

Every UI ticket should be checked against the matching screen in the design file before being marked done. The design surfaced one feature not in the original backlog — an AI-assisted template copy tool (GC-059) — which is blocked on an LLM API key decision only Sharifur can make; see that ticket.

## Stack

- **Backend**: NestJS (TypeScript), PostgreSQL via Drizzle ORM, BullMQ + Redis for all queued/scheduled work
- **Frontend**: React (Vite) + TypeScript, Tailwind CSS for styling, Zustand for client-side state, TipTap for the rich text template editor
- **Sending**: AWS SES (bulk/primary) and Gmail Workspace API (rotated secondary senders) — see "Sender accounts" below
- **Storage**: Cloudflare R2 for template images (never base64 in the DB)
- **Email verification**: Reoon API (primary, cheapest), NeverBounce (fallback), with a local syntax/MX/disposable-domain pre-filter before either
- **Package manager**: npm (with npm workspaces for the monorepo) — not pnpm/yarn

## No Docker

PostgreSQL and Redis are already installed and running on this machine — Sprint 0 only needs a new database created, not a fresh install:

```bash
createdb geniuscampaign_dev
```

NestJS and React run via their normal dev servers (`nest start --watch`, `vite`), started directly or via an `npm run dev` root script (using `concurrently` or npm workspaces' `-ws` flag) — not via `docker-compose up`. Don't introduce Docker/docker-compose into this repo without asking first; if a future ticket seems to need it (e.g. for a specific service), flag it rather than adding it silently.

## Repo layout (target)

```
geniusCampaign/
  apps/
    api/          NestJS backend
    web/          React admin app
  packages/
    shared/       Shared TS types (DTOs, enums) used by both api and web
  docs/
    SPRINT_PLAN.md
    TICKETS.md
    design/
      geniusCampaign.dc.html   Imported visual design — reference only, don't try to run it
      DESIGN_TOKENS.md         Tailwind config extracted from the design
      README.md
    decisions/     ADR-style notes for anything non-obvious, add as needed
  CLAUDE.md
```

Use npm workspaces (`"workspaces"` field in the root `package.json`) — set this up in GC-001. No pnpm/yarn.

## Architectural decisions that must not be silently violated

These came out of earlier design work and are load-bearing — if a ticket seems to push against one of these, stop and flag it rather than working around it quietly.

1. **Sequence enrollment is per-contact, not per-sequence.** A `sequence` is a template (steps + delays); a `sequence_enrollment` is one row per (sequence, contact) with its own `currentStepId` and `nextRunAt`. A contact enrolled long after a sequence "started" gets a fresh row starting at step 1 — there is no shared sequence-wide clock. Never add a "sequence started at" concept that enrollments read from.
2. **Pause/resume/stop/enroll always go through one shared service** (`EnrollmentService`), called identically by the public HMAC-signed webhook controller and the internal admin controller. Never duplicate this state-transition logic in a second place — webhook-triggered and manually-triggered actions must be provably identical.
3. **The sequence runner re-checks enrollment status immediately before executing a step**, not just when the job was first queued. This is what makes pause "take effect immediately" without needing to find and cancel an already-scheduled job. Any new scheduled/delayed action on an enrollment must follow the same re-check-before-acting pattern.
4. **Inbound webhooks are HMAC-signed** (`X-Signature` header against a per-endpoint secret), never a bare token in the URL. Every inbound webhook call gets logged to `webhook_deliveries` before processing, for replay/debugging.
5. **Spintax is resolved once per send and the resolved subject/body is stored on the `sends` row.** Never resolve spintax at template-save time, and never resolve it more than once per actual send — this is what lets you debug "what did this specific recipient receive" and analyze which spin variant performs best. **Resolve personalization tokens (`{{contact.x}}`) before spintax, not after** — spintax's `{a|b}` parser mis-parses a token's doubled braces as a nested spintax group and silently eats it (`Hi {{contact.firstName}}` → `Hi contact.firstName`). Caught by `sequence-runner.service.spec.ts`; if you add a third resolution pass (e.g. dynamic fields), resolve it in the same "innermost/most-literal first" order.
6. **Template images go to Cloudflare R2 via a presigned URL, never base64 into the TipTap document.** The editor's image node stores an R2 URL string only.
7. **Sender accounts (SES and Gmail) sit behind one `EmailSenderProvider` interface**, selected by `SenderAccountService.pickAccountForSend()` based on remaining daily quota headroom, dispatched through one `SendDispatcherService`. New sending providers (if ever added) implement the same interface rather than creating a parallel sending path.
8. **Suppression list is checked before every send, not just at contact-import time.** Hard bounces and complaints go in immediately; soft/transient bounces only after repeated occurrences (see GC-018).
9. **Gmail sending defaults to a conservative daily cap per mailbox (300/day)**, well under Google's ~2,000/day ceiling — this is intentional, not a bug to "fix" by raising it without discussion. Gmail bounce detection is inbox-polling/DSN-parsing (heuristic), unlike SES's structured SNS events — treat single Gmail-detected bounces as a softer signal.
10. **Everything that happens "later"** (a sequence step wait, a scheduled send, a verification API call, a webhook retry) **is a BullMQ job**, not a custom setTimeout/cron loop. This is what makes the system survive restarts and scale past one process.
11. **Auth is minimal JWT, decided 2026-07-11.** `users` table with `owner | editor | viewer` roles. `POST /auth/register` — the first user ever registered becomes `owner`, everyone after defaults to `viewer` (no invite-by-email flow; an owner promotes others via `PATCH /users/:id/role`). `JwtAuthGuard` + `RolesGuard` currently gate only the RBAC-scoped controllers named in GC-056 (templates/sequences/lists) — reads need any authenticated role, writes need `owner`/`editor`. Don't silently expand guard coverage to other controllers (contacts, tags, webhooks) without a ticket — GC-056 named its scope deliberately. `AuditLogService` is called from every guarded write endpoint; `GET /audit-log` is `owner`-only.
12. **One internal event bus (`EventEmitter2`, global via `EventEmitterModule.forRoot()`), everything that produces a domain event emits on it — nothing calls the trigger engine or the outbound webhook dispatcher directly.** `ContactsService`/`TagsService`/`ListsService`/`TrackingService`/`SuppressionService`/`SequenceRunnerService` all just `emit()`; `TriggerEvaluationService` (GC-035) and `OutboundWebhookEventListener` (GC-037/043 bridge) are two independent listeners on the same bus, each with explicit `@OnEvent('event.name')` handlers per event type — never a wildcard listener. This is what lets GC-035's auto-enrollment and GC-043's external webhook forwarding both react to the same `contact.tag_added`/`email.bounced`/etc. without the emitting service knowing either consumer exists. Adding a new consumer of an existing event = a new `@OnEvent()` listener, not a new call site in the producer.

## Reference implementations already drafted

Three feature areas were fully designed and coded (as standalone bundles) before this repo existed, during planning conversations. They are not yet imported into this repo — pull them in when the corresponding ticket comes up rather than re-designing from scratch:

- **Cloudflare R2 image uploads for TipTap** — presigned-upload flow, upload placeholder plugin, `R2Image` extension. Covers GC-015.
- **Gmail Workspace multi-account sending** — OAuth-per-mailbox connect flow, encrypted token storage, `SenderAccountService`/`SendDispatcherService`/`GmailSenderProvider`/`SesSenderProvider`, quota-aware rotation, DSN-based bounce scanner. Covers GC-044 through GC-047.
- **Per-contact sequence enrollment control** — `EnrollmentService`, the webhook and admin controllers, the BullMQ sequence runner with the race-safe status re-check, and the contact-profile UI panel. Covers GC-031, GC-032, GC-034, GC-041, GC-042.

Ask for these to be re-delivered/pasted in when you reach those tickets if they're not already sitting in this folder somewhere.

## Environment variables (consolidated)

```
# Database / queue
DATABASE_URL=postgresql://localhost:5432/geniuscampaign_dev
REDIS_URL=redis://localhost:6379

# Auth (JWT) — generate with `openssl rand -hex 32`
JWT_SECRET=

# AWS SES — AWS_ACCESS_KEY_ID/SECRET_ACCESS_KEY read from the standard AWS SDK
# credential chain rather than a custom var name
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SES_CONFIGURATION_SET=
SES_FROM_EMAIL=

# Cloudflare R2
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_PUBLIC_BASE_URL=

# Gmail Workspace sending
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
ADMIN_APP_URL=
TOKEN_ENCRYPTION_KEY=
GMAIL_DEFAULT_DAILY_LIMIT=300

# Email verification
REOON_API_KEY=
NEVERBOUNCE_API_KEY=

# Tracking
TRACKING_DOMAIN=track.yourdomain.com
TRACKING_SIGNING_SECRET=

# Outbound webhooks
OUTBOUND_WEBHOOK_HMAC_SECRET=

# Slack notifications
SLACK_WEBHOOK_URL=

# GC-059 AI-assisted template copy — multi-provider (openai | deepseek)
LLM_PROVIDER=openai
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
```

Keep `.env.example` at the repo root in sync with this list as tickets add new integrations.

## Conventions

- TypeScript strict mode everywhere, no `any` beyond the narrow spots already called out in the reference implementations (Gmail/SES provider callback typing).
- Drizzle ORM for all schema/migrations (`drizzle-kit`) — never hand-write SQL migrations unless Drizzle genuinely can't express something. (Changed from Prisma 2026-07-11 — Sharifur's call, coming from a Laravel background and wanting to work directly with the query builder/schema-as-code style.)
- NestJS modules are feature-scoped (`contacts/`, `templates/`, `sequences/`, `sender-accounts/`, `webhooks/`, `tracking/`, `verification/`), each with its own controller/service/module — mirrors the folder layout used in the reference implementations.
- Frontend state: Zustand stores are feature-scoped (one store per domain area — e.g. `useContactsStore`, `useSequenceBuilderStore`), not one giant global store. Server data fetched via the API client belongs in the component/query layer (or a small data-fetching hook), not duplicated into Zustand — Zustand is for client-only UI/session state, not a cache of server state.
- Styling is Tailwind utility classes directly in JSX; avoid introducing a second styling approach (CSS modules, styled-components, etc.) alongside it. `tailwind.config.ts` has **no spacing scale extension**, so fractional utilities like `mb-4.5`/`gap-6.5`/`h-8.5` are invalid and silently no-op (Tailwind only ships `0.5/1.5/2.5/3.5` as fractional spacing by default — nothing at `.5` above that). Found live 2026-07-12 across several screens where `.5`-increment classes had been used freely, collapsing intended gaps to zero. Use a whole-number class or an arbitrary value (`gap-[26px]`) for anything the default scale doesn't cover — never guess at a fractional class name without checking it's in the config or Tailwind's default scale first.
- Before adding a new external dependency (npm package or third-party API), check if `docs/SPRINT_PLAN.md` or this file already names a chosen tool for that concern — don't introduce a second templating library, a second queue system, etc.
- This is an internal tool: skip building custom RBAC/multi-tenancy beyond what GC-056 scopes, skip a public-facing GDPR self-service UI (an admin script is enough), but do not skip deliverability/compliance basics (suppression list, unsubscribe headers, HMAC on webhooks) — those protect the sending domain's reputation regardless of who the tool's users are.

## Autonomous working mode

Work through `docs/TICKETS.md` sequentially, per `docs/SPRINT_PLAN.md`'s ordering, without pausing to ask permission on each individual ticket — that's the point of this section. This applies to any session working in this repo, whether that's a continuation of the planning conversation this file came from, or a fresh Claude Code session run locally in this folder.

**Keep going, ticket by ticket, until either the backlog is exhausted or you hit a real stop condition (below).** Update `docs/TICKETS.md`'s status column and the ticket's own notes as you complete or block each one — that file is the shared memory across sessions, since each new session starts with no memory of prior ones and reconstructs where things stand entirely from this file plus the ticket statuses.

### Before starting a ticket

Check whether it needs a credential, account, or external API key (AWS SES verified identity, Cloudflare R2 bucket/keys, Google OAuth client, Reoon/NeverBounce API keys, an LLM API key for GC-059). If `.env` still has the placeholder/empty value for something the ticket needs, don't start it — mark it `Blocked (needs: <specific thing>)` in `docs/TICKETS.md` and move to the next ticket that isn't blocked. Don't invent placeholder credentials or stub past this in a way that could look like it's working when it isn't wired to anything real.

### Self-testing before marking a ticket done

- Prefer automated checks: unit/integration tests where the ticket's acceptance criteria call for them, and for UI tickets, an automated pass against the actual running dev server rather than eyeballing code.
- **If running locally on the Mac** (where the dev server, local Postgres/Redis, and the real Chrome browser all live): start the dev server, use the Claude in Chrome browser automation tools to navigate the just-built screen, exercise its interactions, and visually compare it against the matching screen in `docs/design/geniusCampaign.dc.html`. This is the "autonomous Chrome testing" step — do it as part of finishing each UI ticket, not as a separate pass at the end.
- **If running in an environment without access to the Mac's browser** (e.g. a remote/cloud session): use Playwright headless against a locally-started dev server instead, and note in the ticket that a human visual pass with real Chrome is still worth doing before considering the UI polished.
- Either way, actually start the server and hit real endpoints/pages — don't mark a ticket done from reading the code alone.

### Hard stop conditions — don't guess past these

Mark the ticket `Blocked` with a specific, actionable note and move on to other unblocked work rather than stalling everything or improvising a workaround:

- Missing credentials/API keys/accounts (see above).
- Anything destructive or irreversible: dropping/truncating real data, force-pushing, deleting files outside this repo, revoking access.
- A genuine product decision not resolvable from this file, `docs/TICKETS.md`, or the design file — e.g. the design shows a state that isn't specified in a ticket's acceptance criteria, or two documents disagree.
- Anything that would reach real external systems with real consequences: never send actual email to real contacts, never spend real money, never call a paid verification/AI API without a real key explicitly provided for that purpose. Use sandbox/test equivalents (SES sandbox mode, a fixed internal test address list, mocked API responses) for all of Sprint 0–2's self-testing.
- If a ticket turns out to be substantially bigger or different than scoped, split or rewrite it in `docs/TICKETS.md` rather than silently expanding scope inside it.

### Committing progress

Commit real, working code incrementally — roughly one commit per completed ticket (or a tightly related small group), not one large uncommitted pile. This is what lets a human check in on progress at any point without needing to read every file, and what lets a future session resume cleanly if the current one stops mid-backlog for any reason (context limits, a blocker, or simply running out of turn).

## Definition of done (per ticket)

- Code implements the ticket's acceptance criteria in `docs/TICKETS.md`.
- Manually exercised at least once (this is a small internal tool — full automated test coverage is not the bar, but don't merge unexercised code).
- `docs/TICKETS.md` status updated for that ticket.
- If the ticket revealed a decision worth remembering, add it to this file's "architectural decisions" list or `docs/decisions/`.
