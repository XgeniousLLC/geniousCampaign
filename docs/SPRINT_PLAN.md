# Sprint plan

Five sprints, worked through in order. Each sprint's exit criteria is "this is usable on its own," not just "code exists" — Sprint 1 alone should already be able to send a real one-off campaign before Sprint 2 starts.

No fixed calendar dates — sized instead as S/M/L per ticket in `TICKETS.md`, work through them one at a time regardless of how long each sprint takes in practice. Update ticket status as you go; there's no separate sprint-tracking tool, this doc + TICKETS.md is it.

Work proceeds autonomously, ticket by ticket, per `CLAUDE.md`'s "Autonomous working mode" section — read that before starting Sprint 0.

## Sprint 0 — Project setup (no Docker)

**Goal:** a working local dev environment and empty-but-running NestJS + React apps talking to the already-installed local Postgres and Redis, with no containers involved.

**Exit criteria:** `npm run dev` boots both apps locally; a health-check endpoint responds; Prisma can migrate against the local DB.

Tickets: GC-001 – GC-008

## Sprint 1 — Foundation

**Goal:** contacts, tags/lists, templates with the spintax editor and R2 image uploads, and the ability to actually send a one-off campaign through SES with suppression-list enforcement and open/click tracking.

**Exit criteria:** an admin can import a CSV of contacts, write a template (with spintax and an uploaded image), and send it as a one-off campaign to a list, and see opens/clicks/bounces recorded afterward.

Tickets: GC-010 – GC-021

## Sprint 2 — Automation core

**Goal:** sequences (drip campaigns) with per-contact enrollment, condition-based and schedule-based triggers.

**Exit criteria:** an admin can build a 3-step sequence, have a contact auto-enroll when a tag is added, watch it progress step by step, and pause/resume/stop it manually from the contact's profile.

Tickets: GC-030 – GC-037

## Sprint 3 — Integration surface

**Goal:** everything becomes controllable from outside the admin UI (webhooks), sending capacity expands to rotate across Gmail Workspace mailboxes alongside SES, and contacts get verified before they're sent to.

**Exit criteria:** an external system (tested via a manual `curl`/Postman call, or a Zapier/Make test) can enroll, pause, resume, and stop a specific contact in a specific sequence via webhook. Sends rotate across at least one connected Gmail account and SES. New contacts get verified via Reoon before being marked sendable.

Tickets: GC-040 – GC-049

## Sprint 4 — Safety net & polish

**Goal:** the things that keep a small team from accidentally wrecking their sending reputation or blasting the wrong list, plus the reporting a marketer actually wants to look at.

**Exit criteria:** a bad list import or a bug can't silently blow up bounce rate unnoticed — it gets caught and paused automatically, with a Slack ping. Basic analytics dashboard and email log exist.

Tickets: GC-050 – GC-060 (GC-059 is blocked pending an LLM provider/API key decision — see `TICKETS.md`)

## Working agreement

- Pick the next not-started ticket in the current sprint, in order, unless something later is genuinely blocking (dependencies are noted per-ticket in TICKETS.md).
- Don't start a Sprint N+1 ticket while Sprint N still has "In Progress" tickets open, except where explicitly fine to parallelize (noted per-ticket).
- If a ticket turns out to be bigger than it looked, split it in TICKETS.md rather than letting scope quietly grow inside one ticket.
