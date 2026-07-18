## Settings & Members

What this page is for: managing team access and roles, reviewing who did what (audit log), viewing the suppression list, and configuring every external integration credential (owner-only tabs).

**Where to find it:** sidebar > **Settings** (`/settings`). Tabs: **Members**, **Audit log**, **Suppression list**, **Debug log**\*, **AI usage**\*, **API keys**\*, **Integrations**\* (\* = owner-only tabs, hidden entirely for non-owners).

### Adding a team member (owner only)

1. Go to **Settings > Members**, click **Add member**.
2. Enter their name (optional), email, and set an **initial password** for them yourself (8+ characters) — no invite email is sent, since this is an internal tool; share the password with them directly, out of band.
3. Choose their **role**: **owner** (full access, including Members/Integrations/API keys/Audit log), **editor** (can create/edit everything except those owner-only areas), or **viewer** (read-only everywhere).
4. Click **Add member**.

### Changing a member's role, and why you can't change your own

1. As an owner, use the role dropdown next to any other member's name to change it instantly.
2. Your own row shows your role as a plain badge, not a dropdown — an owner can't change their own role. This is deliberate: it prevents an owner from accidentally demoting themselves out of access; another owner has to make that change for you.

### Reviewing activity (Audit log, owner only)

Every guarded write action (template/sequence/list edits, etc.) is recorded here with who did it, what action, what type of entity, and when. Paginated — use the page controls at the bottom to go further back.

### The Suppression list

Shows every address currently blocked from receiving mail, with its reason: **hard bounce**, **spam complaint**, **repeated soft bounce**, **manual unsubscribe**, or **invalid email** (from a failed verification). This list is checked before every single send across campaigns, sequences, and lists — not just at import time — so an address landing here takes effect immediately everywhere.

### Configuring integrations (Settings > Integrations, owner only)

1. Pick a category tab (AWS SES, Cloudflare R2, Email verification, Tracking domain, AI-assisted copy, SES/SNS, etc.). Click the ⓘ icon next to a category's name for step-by-step setup instructions where available.
2. Fill in the fields and click **Save**. A field's label shows whether its current value came from **`.env`** or was **saved here** (the database) — anything saved here overrides `.env` immediately, with no server restart needed. Click **Clear** on a saved field to fall back to `.env` again.
3. **AI-assisted copy**: choose a provider (OpenAI or DeepSeek) and a model, and paste in that provider's API key — this is what powers Templates' **AI Assist** and AI shuffle-variant generation. Leaving this unconfigured doesn't break the app; it just means those AI features return an error when used instead of silently working.
4. **Tracking domain** is handled differently from every other field on this page: type the domain (e.g. `track.yourdomain.com`) and click **Check DNS** rather than Save. The system verifies a live DNS CNAME pointing from that domain to this API before it's accepted — if the record isn't there yet, you're shown exactly what record to add (type/host/value, with a copy button) and can click Check DNS again once you've added it. This check always runs, even in local/test environments, so a typo'd or unowned domain can never quietly become your open/click tracking host.
5. **Email verification**: pick which provider (Reoon/NeverBounce) is tried first, and use **Clear cached results** if you need every contact to re-check against a newly chosen provider immediately instead of waiting out the normal cache window.

### Debug log and AI usage (owner only)

- **Debug log** lists backend/frontend errors as they occur — click a row to expand its full stack trace.
- **AI usage** totals AI Assist calls, tokens, and estimated cost, broken down by provider and model — useful for keeping an eye on spend if you've configured a paid LLM provider.

### Things to know

- Integrations, API keys, Debug log, and AI usage tabs are completely invisible to non-owners — not just disabled, they don't render at all.
- Saving a credential here takes effect immediately across the whole app; there's no separate "publish" or restart step.
- The tracking domain check runs against the live DNS record every time — there's no way to save a value that hasn't actually passed the CNAME check.
