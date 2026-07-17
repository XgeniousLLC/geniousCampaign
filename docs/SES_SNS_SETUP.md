# AWS SES → SNS bounce/complaint webhook

Wires real SES bounce and complaint notifications into the app's suppression
list (`suppression_list` table, [CLAUDE.md](../CLAUDE.md) invariant 8). Without
this, `sends.status` never updates past `sent`, and hard-bounced/complained
addresses are never auto-suppressed — the app has no way to learn a send
failed after SES accepted it.

The endpoint itself (`POST /webhooks/ses/sns`,
[`apps/api/src/suppression/ses-sns.controller.ts`](../apps/api/src/suppression/ses-sns.controller.ts))
is already built and code-complete (GC-018) — this doc is the one-time manual
AWS-console wiring to point real notifications at it. It has no auth of its
own (a bare token in the URL would violate invariant 4's HMAC rule, and SNS's
HTTP(S) delivery doesn't support custom signing headers) — trust is instead
established by SNS's own subscription-confirmation handshake (step 4 below):
only whoever created the subscription in the AWS console can direct traffic
here.

## What it does

- **Hard bounce (`Permanent`)** → immediately suppresses that address (`suppression_list`, reason `hard_bounce`).
- **Soft bounce (`Transient`/`Undetermined`)** → increments a per-email counter; the 3rd occurrence auto-suppresses (reason `repeated_soft_bounce`).
- **Complaint** → immediately suppresses (reason `complaint`).
- Either way, the originating `sends` row (matched by `providerMessageId`) gets its `status` updated to `bounced`/`complained` — this is what GC-050's bounce-rate circuit breaker reads.

## Setup steps

1. **Get the webhook URL.** Settings > Integrations > "SES bounce/complaint webhook" shows the exact URL for this deployment (derived from the request host, so it's correct for local dev, staging, or prod without editing this doc). It looks like `https://<your-api-host>/webhooks/ses/sns`.

2. **Create an SNS topic.** In the AWS SNS console, create a new *Standard* topic — e.g. `ses-notifications`. (Not FIFO — SES doesn't publish to FIFO topics.)

3. **Subscribe the webhook to it.** On that topic, create a subscription: protocol `HTTPS`, endpoint = the URL from step 1.

4. **Let it auto-confirm.** SNS immediately POSTs a `SubscriptionConfirmation` message to the endpoint. The controller detects this message type and fetches the `SubscribeURL` itself — no manual click-through needed. Refresh the subscription in the SNS console after a few seconds; it should read "Confirmed". If it stays "Pending confirmation", the URL isn't reachable from the public internet yet (check DNS, firewall, or that the deploy is actually live).

5. **Point SES at the topic.** In the SES console, open the configuration set named by `SES_CONFIGURATION_SET` (or the sending identity, if you're not using a configuration set) and add an **Event destination** of type SNS, subscribed to the `Bounce` and `Complaint` event types, targeting the topic from step 2.

6. **Verify end-to-end.** Send a real email to one of SES's [mailbox simulator addresses](https://docs.aws.amazon.com/ses/latest/dg/send-email-simulator.html) — `bounce@simulator.amazonses.com` for a hard bounce, `complaint@simulator.amazonses.com` for a complaint. Within a few seconds the address should show up in Settings > Suppression list with the matching reason.

## Notes

- This is entirely separate from Gmail sending's bounce detection (GC-046), which polls for DSNs instead — SES gets structured, near-real-time bounce data via SNS; Gmail's signal is heuristic. See CLAUDE.md invariant 9.
- No `SNS_TOPIC_ARN` or similar needs to go in `.env` — the app doesn't need to know the topic exists; the topic just needs to know the app's URL.
- Rotating domains/hosts (e.g. moving from a staging URL to a production one) means repeating steps 1–4 for a new subscription — the old one won't auto-update.
