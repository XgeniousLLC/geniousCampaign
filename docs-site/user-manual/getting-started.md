## Getting started

What this page is for: signing in, setting up the very first account, recovering a forgotten password, and getting oriented in the app shell (navigation, page titles, the "New" menu).

**Where to find it:** `/login`, `/register`, `/forgot-password`, `/reset-password` (all outside the logged-in app), and `/profile`, `/settings/change-password` once you're signed in.

### First-time setup (one-time only)

geniusCampaign is an internal tool with no public sign-up. Exactly one account — the workspace **owner** — is created through a one-time setup form; every account after that is added by an owner from **Settings > Members**, not through this form.

1. Open the app. If no account exists yet, you're sent straight to the **Create account** screen instead of a login form (there's nothing to log into yet).
2. Enter a work email, a password (at least 8 characters), and confirm the password.
3. Submit. This becomes the sole **owner** account, and you're signed in immediately.
4. From then on, this form is gone — visiting it again redirects you to **Sign in**, and the backend permanently refuses to create a second account this way.

If you're an owner and need to add teammates later, use **Settings > Members > Add member** instead (see `settings-and-members.md`) — that flow sets an initial password directly; no invite email is sent.

### Signing in

1. Go to `/login`, enter your work email and password.
2. Optionally check **Remember me for 14 days** to stay signed in longer.
3. Submit. On success you land on the Dashboard.

### Resetting a forgotten password

1. From the sign-in screen, click **Forgot?** next to the Password label.
2. Enter your email and submit. You'll see a generic "if that email has an account, a reset link has been sent" message regardless of whether the address exists — this is intentional and doesn't confirm which emails are registered.
3. Open the emailed reset link (`/reset-password?token=...`), set a new password (8+ characters), and submit. You're redirected to sign in automatically after a couple of seconds.

### Changing your password or profile while signed in

1. Click your name/avatar in the top-right corner, then **Change password** — enter your current password and a new one (8+ characters, confirmed twice).
2. Or click **Profile** from the same menu to view your role and member-since date, and edit your display name/email via **Edit profile**.

### Finding your way around

- The left sidebar groups pages under **Audience** (Contacts, Lists & Tags, Verification), **Content** (Templates), **Delivery** (Campaigns, Sequences, Triggers), and **Infrastructure** (Sender Accounts, Webhooks, Email Log), with **Settings** pinned at the bottom.
- Click the hamburger icon at the top-left to collapse/expand the sidebar.
- The **New** button in the top bar is a shortcut menu to start a new campaign, template, or sequence from anywhere.
- The browser tab title updates to match whichever page you're on.
- A small dot badge appears next to **Sender Accounts** in the sidebar when any active sender is at 90%+ of its daily send quota — a heads-up before a send gets blocked mid-campaign.

### Things to know

- Your role (owner, editor, or viewer) controls what you can do — viewers can see everything covered in this manual but can't create, edit, or trigger actions; editors can do everything except manage members/API keys/Integrations/audit log, which are owner-only.
- You can't change your own role from Settings > Members — an owner has to change it for you, which also prevents an owner from accidentally locking themselves out.
- There's no "forgot my role" recovery — if every owner account is lost, restoring access requires direct database access.
