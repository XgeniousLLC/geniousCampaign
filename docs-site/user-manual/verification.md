## Verification

What this page is for: checking whether contacts' email addresses are actually deliverable before you send to them, in bulk, using a paid third-party verification service.

**Where to find it:** sidebar > **Verification** (`/verification`).

### Running a bulk verification pass

1. Click **Bulk verify** (it shows how many contacts are currently unverified). This queues a background job over every not-yet-checked contact.
2. Progress updates automatically every 10 seconds while the job runs — you don't need to keep the tab open, but you'll see live progress if you do.
3. When it finishes, you'll see how many were checked out of the total, and a breakdown of any failures.
4. If some checks failed because the provider was rate-limiting requests, that's called out separately — those are retried automatically already, and will resolve on their own; just click **Bulk verify** again in a few minutes to pick up whatever's still pending. A failure count *not* explained by rate-limiting is a real problem worth checking (API key, quota) under Settings > Integrations.

### How a check actually works (so the numbers make sense)

1. **Local pre-filter first** — a syntactically invalid address, one on a disposable-email domain, or one with no MX record is rejected instantly, without ever calling a paid API.
2. **Cache** — a result already checked in the last 6 months is reused instead of re-querying the provider.
3. **Reoon is the default provider**; if it fails or errors, **NeverBounce** is used as a fallback automatically — but only if NeverBounce actually has an API key configured. If the primary is simply being rate-limited, the system retries the primary itself first (a few times, with increasing delay) before ever falling back or giving up.
4. Any address that comes back **invalid** or **risky** (catch-all domain, can't be conclusively confirmed) is automatically added to the suppression list right away — you don't need to separately suppress it, and future sends to it are blocked from every list, campaign, and sequence.

### Reading the stats

The four stat tiles — **Valid**, **Invalid**, **Risky**, **Unverified** — cover your entire contact base, each with a bar showing its share of the total.

### Things to know

- **Verification credits** aren't shown as a live balance — Reoon/NeverBounce don't expose a cheap balance-check endpoint, so this is intentionally displayed as "Not tracked" rather than a fake number.
- Switching the default provider (Settings > Integrations > Email verification) only affects contacts not already cached — use **Clear cached results** on that same Integrations tab if you need everyone to re-check against the newly chosen provider immediately.
- The per-contact verify icon on the Contacts page and this page's bulk verify both do the *real* paid check (auto-suppressing invalid/risky results); the Contacts page's bulk-selection **Verify** button is a different, free, local-only syntax/MX check — don't confuse the two.
- Once a contact is auto-suppressed by verification, sending to them is blocked everywhere, immediately — suppression is checked fresh on every send, not just at import/verify time.
