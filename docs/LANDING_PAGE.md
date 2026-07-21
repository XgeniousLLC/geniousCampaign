# Landing page spec

Default content/structure doc for the frontend team building the public marketing landing page for geniusCampaign. This is **not** the admin app (`apps/web`) — it's a separate static/marketing page, same pattern xgenious uses for its other free self-hosted products (see reference below). Scope: one scrolling page + links out to GitHub and the docs site. No new backend work implied by this ticket.

## References

- **Structure/tone model:** [xgenious.com/free-software/genius-school-management](https://xgenious.com/free-software/genius-school-management) — how xgenious presents its other free, self-hosted, MIT-licensed products (module count, tech stack line, target-user list, three CTAs: Landing page / Live demo / User manual). Match this pattern, not a generic SaaS-startup template.
- **Docs/user manual to link to:** [xgeniousllc.github.io/geniousCampaign](https://xgeniousllc.github.io/geniousCampaign/#/) — deployment guide + feature-by-feature manual. The landing page is the top-of-funnel piece; the docs site is where "User manual" and "Deployment guide" CTAs go.
- **Visual/brand tokens:** `docs/design/DESIGN_TOKENS.md` — indigo accent (`#6366F1`), Geist/Geist Mono fonts. The admin app itself is a dense dark-theme B2B console (see `docs/design/geniusCampaign.dc.html`); the landing page doesn't have to be dark-theme, but should reuse the accent color, font family, and border-radius scale so the product feels the same when a visitor clicks through from marketing page → login screen.
- **Source of truth for feature copy:** root `README.md` — keep feature names/descriptions in sync with it rather than inventing new ones.

## Positioning

> Free, open-source, self-hosted email marketing and outreach platform. Contacts, templates, sequences, campaigns, deliverability, and sender rotation in one console — built and maintained by xgenious.com.

Key trust point to repeat in at least two places on the page (hero + one deeper section): **bring your own AWS SES / Gmail Workspace / Cloudflare R2 / verification-provider credentials — nothing routes through a third-party server.** This is the product's main differentiator from hosted competitors (Smartlead, Instantly, Lemlist, Mailchimp) and should be treated as a headline feature, not a footnote.

License: MIT (root `LICENSE` file). State this explicitly near the CTAs — it's a strong trust signal for the self-hosted-software audience xgenious targets.

## Section-by-section spec

### 1. Nav (sticky, minimal)
- Logo (`apps/web` app logo, reuse — check `apps/web/public` / docs site logo asset used in commit `02bea0e0`)
- Links: Features · Screenshots · Docs · GitHub
- Right side: "Get Started" button → GitHub repo, or docs Quick Start anchor

### 2. Hero
- **Eyebrow:** "Free & open-source · MIT licensed"
- **H1:** "Email marketing and outreach, self-hosted — no vendor renting your sender reputation."
- **Subhead:** "Contacts, templates, sequences, campaigns, and deliverability in one console. Bring your own AWS SES, Gmail Workspace, and Cloudflare R2 — your data and your sending domain stay yours."
- **CTAs:** primary "View on GitHub" (repo URL), secondary "Read the docs" (docs site)
- **Visual:** dashboard screenshot (`docs/screenshots/dashboard.png`), browser-chrome-framed

### 3. Trust bar
Small row under the hero, logo-style text (no fake customer logos — this is B2B infra software, not a consumer product): "Self-hosted" · "MIT licensed" · "No third-party data routing" · "AWS SES + Gmail Workspace"

### 4. Feature grid (8 cards, 2–4 columns responsive)
Pull directly from README, one short line of elaboration each:

| Feature | Card copy |
|---|---|
| Contacts, lists & tags | CSV import with arbitrary column mapping, real-time import progress, pick-or-create lists/tags at import time. |
| Template editor | Rich-text editor with spintax variants and AI-assisted copywriting (OpenAI or DeepSeek). |
| Sequences | Multi-step drip sequences with per-contact enrollment, pause/resume, and per-step delays. |
| Campaigns | One-off sends targeted by list, tag, or hand-picked contacts — with open/click tracking and engagement analytics. |
| Email verification | Bulk deliverability checks (Reoon primary, NeverBounce fallback) before you send. |
| Triggers & webhooks | Auto-enroll contacts on events — tag added, field changed, list joined, or an inbound HMAC-signed webhook. |
| Public API | API-key-authenticated endpoint for external forms/automation tools to push contacts in, with automatic list/tag attachment. |
| Sender rotation | AWS SES and Gmail Workspace accounts, quota-aware, rotated automatically. |

(Team & audit — RBAC, audit log, suppression list — can fold into a 9th card or a "Built for teams" sub-line if the grid looks better at 8.)

### 5. Screenshots gallery
Six images already exist at `docs/screenshots/`, reuse as-is (don't re-export):

1. `dashboard.png` — Dashboard
2. `contacts.png` — Contacts
3. `template-editor.png` — Template editor (spintax + AI assist)
4. `campaign-detail.png` — Campaign detail
5. `sequence-builder.png` — Sequence builder
6. `webhooks.png` — Webhooks

Layout: alternating text-left/image-right rows (or a 2-column masonry grid at minimum), each with a one-sentence caption pulled from the feature grid above — don't write new descriptions that could drift from the README.

### 6. "Bring your own everything" section
Deeper explanation of the self-hosted trust point — this is the section a self-hosting-skeptical visitor reads before clicking GitHub. Cover:
- Nothing proxies through a third-party server; SES/Gmail/R2 calls go directly from your deployment to AWS/Google/Cloudflare.
- Your sending domain's reputation is yours — no shared IP pool.
- Deploy path: Docker (`docker compose up`) or bare-metal — link to `DEPLOY.md`.

### 7. Tech stack strip
Small, logo-row style, matches the pattern xgenious uses on product pages: NestJS · PostgreSQL · Drizzle ORM · BullMQ/Redis · React · Vite · Tailwind · Zustand.

### 8. Comparison (optional but recommended — xgenious's other product pages use "vs X" framing)
Short table: geniusCampaign (self-hosted, one-time free, own infra) vs. hosted tools in this category (Smartlead, Instantly, Mailchimp) — free/self-hosted vs. per-seat/monthly, own data vs. vendor-hosted, bring-your-own-SES vs. shared sending IPs. Keep factual, no disparaging claims.

### 9. Target users
Short list, same pattern as the Genius School Management/CRM/HRM cards: "Marketing teams and agencies running cold outreach who want control of deliverability" · "Developers/agencies self-hosting internal tools for clients" · "Anyone who doesn't want a third SaaS subscription for something four AWS services already do."

### 10. Final CTA band
Repeat: "View on GitHub" / "Read the docs" / license line ("MIT licensed — free forever, self-hosted"). No pricing table — there's no paid tier.

### 11. Footer
- Links: GitHub repo · Docs site · `DEPLOY.md` (deployment guide) · `docs/PUBLIC_API.md` (public API reference)
- "Built and maintained by xgenious.com" with link to xgenious.com
- No newsletter signup / no contact form — match the docs-linking pattern xgenious uses on its free-software pages, not a lead-gen pattern.

## Explicitly out of scope for this page

- No login/signup flows (the admin app handles auth per `CLAUDE.md`'s invariant 11 — the landing page only links out to GitHub/docs, it doesn't host an app instance)
- No pricing/billing (free, MIT-licensed — nothing to charge for)
- No testimonials/customer logos (no customer base to reference honestly — don't fabricate)
- No blog/changelog section (out of scope until requested separately)

## Open questions for Sharifur (don't guess — flag if blocking)

- Final logo asset / favicon source — confirm which file to reuse from the `apps/web` build vs. the docs-site logo added in `02bea0e0`.
- Whether this page lives in this repo (e.g. `apps/landing` or a static `/site` folder) or as a separate repo/deploy target — not specified yet, needed before scaffolding.
