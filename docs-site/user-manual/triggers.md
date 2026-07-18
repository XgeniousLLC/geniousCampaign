## Triggers

What this page is for: automatically enrolling contacts into a sequence when something happens — a condition on a real event, a recurring schedule, or an inbound webhook payload — instead of enrolling people by hand.

**Where to find it:** sidebar > **Triggers** (`/triggers`) for the list; clicking a trigger opens its detail/stats page (`/triggers/:id`).

### Creating a trigger

1. Click **New trigger** and give it a name.
2. Pick a **trigger type**:
   - **Condition-based** — fires when a real event happens and matches a condition you set. Choose an event (`contact.created`, `contact.tag_added`, `contact.field_changed`, `contact.list_joined`, `email.opened`, `email.clicked`), then a field/operator/value (e.g. field `tagName`, operator `equals`, value `Demo Booked`).
   - **Schedule-based** — fires on a recurring cron schedule you define (e.g. `0 9 * * 1` for every Monday at 9am) plus a timezone.
   - **Webhook-based** — fires when a signed inbound webhook payload arrives at a webhook endpoint you've already created (see `webhooks.md`) and matches a condition checked against that payload's fields. You must create the webhook endpoint first — the picker warns you if none exist yet.
3. Choose which **sequence** a match should enroll the contact into.
4. Click **Create trigger**.

### Managing triggers

- From the list, click **Pause**/**Resume** to toggle a trigger active or inactive without deleting it, or **Delete** to remove it entirely.
- Each row shows a running **fired** count and an active/paused badge.

### Reading a trigger's fired-events history

Open a trigger to see:

- Four stat tiles: **Total fires**, **Enrolled** (with a success-rate percentage), **Skipped** (already enrolled, or an error — shown together), and **Last fired**.
- A full **fired events** log — every time this trigger's condition matched, who it matched (contact email, linked to their profile), the event type, whether it actually resulted in a new enrollment or was skipped (e.g. because that contact was already enrolled in the target sequence), and a timestamp.

### Things to know

- A trigger firing and matching a contact who's already actively/paused-enrolled in the target sequence counts as "skipped," not an error — it's the expected, safe behavior rather than a duplicate enrollment.
- Webhook-based triggers depend on the same HMAC-signed inbound webhook mechanism described in `webhooks.md` — the payload has to actually reach and pass signature verification at that endpoint before any trigger condition is evaluated against it.
- Deleting a trigger doesn't affect contacts it already enrolled — their enrollments keep running/pausing/stopping independently, per the sequence enrollment model in `sequences.md`.
