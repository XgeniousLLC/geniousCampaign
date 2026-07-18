## API keys & the public API

What this page is for: giving an external tool you don't control the code for — a website contact form, Zapier, Make, a simple script — a straightforward way to push contacts into Genius Campaign, without needing them to compute a webhook signature.

**Where to find it:** **Settings > API keys** tab (owner role only) for key management; the actual API endpoints are called by whatever external tool you hand the key to, not from inside this app.

### Creating a key to hand off to a developer or a no-code tool

1. Go to **Settings > API keys**. Enter a **name** that says what it's for (e.g. "Website contact form," "Zapier — new lead").
2. Set an **expiry date** — it defaults to one year out. You can check **Never expire** instead, but the form warns you explicitly: a key that never expires stays valid forever if it's ever leaked or forgotten, so only choose that if you have a real reason to.
3. Click **Create key**. The raw key value is shown exactly once, in a banner with a copy button — copy it now and hand it to whoever's setting up the integration. It cannot be retrieved again after you close that banner; if it's lost, use **Rotate** to issue a new value for the same key entry.
4. Give the developer/integration this one line to use: an `X-Api-Key` header set to the key value, sent with every request.

### What the external tool actually does with it

Hand whoever manages the external tool this summary (full technical detail is in `docs/PUBLIC_API.md` in the repo, for a developer to reference directly):

- **`POST /api/v1/contacts`** — creates a new contact, or updates one that already exists with that email (never errors on a duplicate — it's an upsert). Accepts `email` (required), `firstName`, `lastName`, `customFields` (any key/value pairs), and optionally `listId`/`tagIds` to add the contact to a specific list/tags on the way in.
- **`POST /api/v1/contacts/{email}/stop-sequences`** — stops every active or paused sequence enrollment for that contact across every sequence at once (e.g. call this from a "customer replied" or "converted" automation so they stop receiving further sequence steps). The contact must already exist — this one never creates a contact as a side effect.
- Every request needs the `X-Api-Key` header from step 3 above. Missing, wrong, or expired keys get rejected.

### Managing existing keys

1. Each key in the list shows its name, a partial prefix (never the full value again), its expiry status, and when it was last actually used — a handy way to tell whether an integration is really calling in or has gone quiet.
2. Click **Rotate** to issue a fresh value for the same key entry (same name/expiry) — the old value stops working the instant you do this, so only rotate when you're ready to update the integration with the new value right away.
3. Click **Revoke** to permanently disable a key. This is immediate and can't be undone — create a new key if you need one again.

### Things to know

- Requests to `/api/v1/*` are capped at 60 per minute per key — a flood beyond that gets a `429` response; this is a basic anti-abuse limit, not something adjustable per key from this UI.
- A contact submitted here whose email is already on the suppression list still gets created/updated normally — suppression is only enforced at actual send time, not at contact-creation time, so this never silently fails just because the address bounced previously.
- The public API (bearer `X-Api-Key`) is intentionally different from the inbound webhook framework on the Webhooks page (HMAC-signed) — use this one whenever the integration can only send a static header value, and use the Webhooks page's inbound endpoints when the sending system can compute a per-request signature and you need generic field-mapping/trigger-firing. See `webhooks.md` for that comparison.
