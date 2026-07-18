## Sender Accounts

What this page is for: managing the AWS SES and Gmail mailboxes that campaigns and sequences actually send through, and seeing each one's daily quota usage at a glance.

**Where to find it:** sidebar > **Sender Accounts** (`/settings/sender-accounts`).

### Adding an AWS SES account

1. Click **Add AWS account**. Enter the From email, an optional display name, and a daily send limit (defaults to 50,000).
2. AWS credentials (region, access key ID, secret access key) and an SES configuration set are optional here — leave them blank to use the shared credentials already configured in **Settings > Integrations**, or fill them in to point this specific account at a genuinely separate AWS account/region.
3. Click **Add account**. Each card shows whether it's using its own credentials or falling back to the global Integrations settings.

### Connecting a Gmail mailbox

1. Before the first connection, click the lock icon next to **Connect Gmail account** to configure the shared Google OAuth app (client ID, client secret, and the redirect URI — copy the exact redirect URI shown and register it in Google Cloud Console). This OAuth app is shared by every Gmail mailbox you connect; you only set it up once.
2. Click **Connect Gmail account** — you're redirected to Google to sign in and grant access, then back into the app with the mailbox added.
3. If OAuth isn't configured yet, clicking Connect automatically opens the configuration modal from step 1 instead of showing a raw error.

### Quota-aware sending

- Every account shows a **Daily quota** bar (sent-today / daily-limit), color-coded green/amber/red as it fills up.
- When a campaign or sequence step sends with **Auto (best available)** sender selection, the system picks whichever active account currently has the most quota headroom left — it does not round-robin blindly or always prefer one provider.
- Gmail accounts default to a conservative **300 sends/day** cap per mailbox — well under Google's own roughly 2,000/day ceiling. This is intentional (protects mailbox reputation), not a limitation to raise casually; changing it is a deliberate decision, not a routine tuning knob.
- Gmail bounce detection works by polling the inbox and parsing bounce notification emails (DSNs) — it's a heuristic, unlike SES's structured, real-time bounce/complaint events via SNS. Treat a single Gmail-detected bounce as a softer signal than an SES one.

### Managing an account

1. Click **Deactivate** to stop an account from being selected for new sends without deleting it (existing history stays intact) — click **Activate** to bring it back.
2. Click **Edit** (SES accounts only) to change its display name, daily limit, or credentials.
3. Click **Delete** to remove the account entirely.

### Things to know

- A campaign or sequence step that explicitly picks one specific sender account (instead of Auto) will fail with an error if that account runs out of quota or is deactivated, rather than silently falling back to a different one — pick Auto if you want automatic failover across accounts.
- The SES SNS webhook URL for bounce/complaint notifications is configured on the Settings > Integrations page, not here — see `settings-and-members.md`.
