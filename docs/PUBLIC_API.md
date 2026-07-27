# Public API

A REST surface for external tools (a website contact form, Zapier/Make, a custom script) to push contacts into and manage them within geniusCampaign — auth is a bearer API key, not a login session. This is separate from the [inbound webhook framework](../CLAUDE.md) (HMAC-signed, generic payload mapping, fires triggers) — the public API is purpose-built for contact CRUD, list/tag management, and sequence enrollment control, with a simpler auth story that's easier for arbitrary external tools to call (a static header value, no signature to compute).

## Authentication

Every request needs an `X-Api-Key` header. Create a key from **Settings > API keys** in the app (owner role required) — the raw key is shown exactly once, at creation time. If you lose it, either rotate it (issues a new value, same key row) or revoke it and create a new one; there's no way to retrieve a key's value again.

```
X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Missing, invalid, or expired keys get a `401`.

### Expiry

Every key has an expiry date, defaulting to **1 year** from creation in the UI. A key can be set to never expire, but the create form shows an explicit warning when you do — a key with no expiry stays valid forever if leaked or forgotten, so prefer setting a real date unless there's a specific reason not to.

### Default list/tags

A key's `defaultListId`/`defaultTagIds` (every contact submitted through that key lands in that list/those tags automatically) are no longer set from the create form — the UI only asks for a name and expiry now. The underlying fields still exist and, if set directly against the API, are honored the same way; a request can also specify `listId`/`tagIds` directly (see below), added **on top of** the key's defaults, not a replacement for them.

## `POST /api/v1/contacts`

Creates a new contact, or updates an existing one if the email already exists (upsert by email — never errors on a duplicate).

### Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | Must be a valid email address. |
| `firstName` | string | no | |
| `lastName` | string | no | |
| `customFields` | object | no | Key/value pairs, merged into the contact's existing custom fields on update. Each key is matched against an existing custom field's key (Settings > Custom fields); if no match exists, a new custom field is auto-created (as a `text` field, label derived from the key) so the value has somewhere to attach. Keys are slugified the same way the Settings UI slugifies a label (lowercased, non-alphanumerics collapsed to `_`), so `"Favorite Color"` and `"favorite_color"` resolve to the same field. |
| `listId` | string (UUID) | no | An existing list's id. Added in addition to the key's default list, if it has one. `404` if the id doesn't exist. |
| `tagIds` | string[] (UUIDs) | no | Existing tags' ids. Added in addition to the key's default tags. `404` if any id doesn't exist. |

### Example

```bash
curl -X POST https://your-api-host/api/v1/contacts \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "customFields": { "company": "Acme Inc" }
  }'
```

### Response — `201 Created`

```json
{
  "id": "b3f1c2b0-...-8e2a",
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "status": "active",
  "listId": "b2a1...-list-id",
  "tagIds": ["c1a2...-tag-id"]
}
```

`listId`/`tagIds` in the response reflect what actually got attached — the key's defaults merged with anything the request specified, deduplicated.

### Error responses

| Status | When |
|---|---|
| `400` | `email` missing/invalid, or a malformed field (e.g. `tagIds` not an array of UUIDs). |
| `401` | Missing, invalid, or expired `X-Api-Key`. |
| `404` | `listId` or one of `tagIds` was included in the request but doesn't exist. |
| `429` | Rate limit exceeded — see **Rate limiting** below. |

## `POST /api/v1/contacts/{email}/enroll`

Enrolls an existing contact into a sequence. Reuses the same `EnrollmentService.enroll()` call the admin UI and inbound webhook trigger framework use (`CLAUDE.md` invariant 2) — an API-triggered enrollment is the identical state transition, just reached with a bearer key instead of a session or HMAC signature.

The contact must already exist — this endpoint never creates one as a side effect (unlike `POST /api/v1/contacts` above, which upserts).

Every sequence has an on/off switch — "Enable sequence"/"Disable sequence" on the sequence's own page, or the toggle on the Sequences list. A disabled sequence rejects **all** new enrollments — manual, this API, and trigger-driven alike, since they all funnel through the same enrollment check — with a `409`. It does not affect contacts already enrolled; pause/resume/stop those individually from the sequence's Enrolled contacts tab.

### Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `sequenceId` | string (UUID) | yes | An existing, **enabled** sequence's id. `404` if it doesn't exist, `409` if the sequence is disabled. |

### Example

```bash
curl -X POST https://your-api-host/api/v1/contacts/jane%40example.com/enroll \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{ "sequenceId": "a1b2c3d4-...-seq-1" }'
```

URL-encode the email in the path (`@` → `%40`).

### Response — `201 Created`

```json
{
  "enrollmentId": "d4e2...-enr-1",
  "contactId": "b3f1c2b0-...-8e2a",
  "email": "jane@example.com",
  "sequenceId": "a1b2c3d4-...-seq-1",
  "status": "active",
  "currentStepId": "f6a7...-step-1"
}
```

`status` is `"completed"` with `currentStepId: null` on the rare case of a zero-step or wait-only sequence — nothing to run, so the enrollment is created and immediately marked done, same as enrolling from the UI.

### Error responses

| Status | When |
|---|---|
| `400` | `sequenceId` missing or not a valid UUID. |
| `401` | Missing, invalid, or expired `X-Api-Key`. |
| `404` | No contact exists with that email, or `sequenceId` doesn't exist. |
| `409` | The contact already has an active or paused enrollment in that sequence, or the sequence itself is disabled (see below). |
| `429` | Rate limit exceeded — see **Rate limiting** below. |

## `POST /api/v1/contacts/{email}/stop-sequences`

Stops every **active or paused** sequence enrollment for the contact with this email — across every sequence they're enrolled in, in one call. Enrollment is per-(sequence, contact) with no shared clock (see `CLAUDE.md` invariant 1), so this loops over each of the contact's enrollments and stops each one individually, the same state transition as stopping one manually from the sequence's enrollment list.

The contact must already exist — this endpoint never creates one as a side effect (unlike `POST /api/v1/contacts` above, which upserts).

### Example

```bash
curl -X POST https://your-api-host/api/v1/contacts/jane%40example.com/stop-sequences \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

URL-encode the email in the path (`@` → `%40`).

### Response — `201 Created`

```json
{
  "contactId": "b3f1c2b0-...-8e2a",
  "email": "jane@example.com",
  "stopped": [
    { "enrollmentId": "d4e2...-enr-1", "sequenceId": "a1b2...-seq-1" },
    { "enrollmentId": "f6a7...-enr-2", "sequenceId": "c3d4...-seq-2" }
  ]
}
```

`stopped` is empty if the contact had no active/paused enrollments — this is not an error, it's the correct "nothing to stop" outcome. Already-`completed`/already-`stopped` enrollments are left untouched (not re-included).

### Error responses

| Status | When |
|---|---|
| `401` | Missing, invalid, or expired `X-Api-Key`. |
| `404` | No contact exists with that email. |
| `429` | Rate limit exceeded — see **Rate limiting** below. |

## `GET /api/v1/contacts/{email}`

Returns the full contact profile — tags, lists, and sequence enrollments — so an external tool can inspect a contact and then remove it from one or more of those associations using the sibling `remove-*` endpoints (see below).

The contact must already exist (404 if not) — this endpoint never creates one as a side effect.

### Example

```bash
curl https://your-api-host/api/v1/contacts/jane%40example.com \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

URL-encode the email in the path (`@` → `%40`).

### Response — `200 OK`

```json
{
  "id": "b3f1c2b0-...-8e2a",
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "status": "active",
  "customFields": { "company": "Acme Inc" },
  "tags": [
    { "id": "c1a2...-tag-1", "name": "lead", "color": "#818CF8" },
    { "id": "d4e5...-tag-2", "name": "newsletter", "color": "#34D399" }
  ],
  "lists": [
    { "id": "b2a1...-list-1", "name": "Product Launch" }
  ],
  "sequences": [
    { "sequenceId": "a1b2...-seq-1", "sequenceName": "Welcome Series", "status": "active", "enrolledAt": "2026-03-15T10:30:00Z" },
    { "sequenceId": "c3d4...-seq-2", "sequenceName": "Re-engagement", "status": "paused", "enrolledAt": "2026-04-01T08:00:00Z" }
  ]
}
```

`sequences[].status` is one of `active`, `paused`, `stopped`, or `completed` — the same per-enrollment states used throughout the app (no shared sequence-wide clock, per CLAUDE.md invariant 1).

### Error responses

| Status | When |
|---|---|
| `401` | Missing, invalid, or expired `X-Api-Key`. |
| `404` | No contact exists with that email. |
| `429` | Rate limit exceeded — see **Rate limiting** below. |

## `POST /api/v1/contacts/{email}/remove-sequence`

Stops the contact's enrollment in a specific sequence and records an optional reason in the audit trail. Reuses the same `EnrollmentService.stop()` call the admin UI and webhook controller use (CLAUDE.md invariant 2) — an API-triggered removal is the identical state transition.

The contact must already exist (404 if not) — this endpoint never creates one as a side effect. The enrollment must be active or paused (404 if the contact has no enrollment in this sequence, 409 if it is already stopped/completed).

### Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `sequenceId` | string (UUID) | yes | An existing sequence's id. `404` if it doesn't exist. |
| `reason` | string | no | Free-text reason for removal. Written to the audit log for traceability. |

### Example

```bash
curl -X POST https://your-api-host/api/v1/contacts/jane%40example.com/remove-sequence \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{ "sequenceId": "a1b2c3d4-...-seq-1", "reason": "Contact requested opt-out from sequence emails" }'
```

URL-encode the email in the path (`@` → `%40`).

### Response — `201 Created`

```json
{
  "enrollmentId": "d4e2...-enr-1",
  "contactId": "b3f1c2b0-...-8e2a",
  "email": "jane@example.com",
  "sequenceId": "a1b2c3d4-...-seq-1",
  "status": "stopped"
}
```

### Error responses

| Status | When |
|---|---|
| `400` | `sequenceId` missing or not a valid UUID. |
| `401` | Missing, invalid, or expired `X-Api-Key`. |
| `404` | No contact exists with that email, `sequenceId` doesn't exist, or the contact has no active/paused enrollment in this sequence. |
| `409` | The enrollment is already stopped or completed. |
| `429` | Rate limit exceeded — see **Rate limiting** below. |

## `POST /api/v1/contacts/{email}/remove-list`

Removes a contact from a static list. The list must exist (404 if not) — this validates the `listId` is real. No error if the contact was not already in the list; the remove is idempotent.

The contact must already exist (404 if not) — this endpoint never creates one as a side effect.

### Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `listId` | string (UUID) | yes | An existing list's id. `404` if it doesn't exist. |

### Example

```bash
curl -X POST https://your-api-host/api/v1/contacts/jane%40example.com/remove-list \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{ "listId": "b2a1...-list-1" }'
```

URL-encode the email in the path (`@` → `%40`).

### Response — `201 Created`

```json
{
  "contactId": "b3f1c2b0-...-8e2a",
  "email": "jane@example.com",
  "listId": "b2a1...-list-1"
}
```

### Error responses

| Status | When |
|---|---|
| `400` | `listId` missing or not a valid UUID. |
| `401` | Missing, invalid, or expired `X-Api-Key`. |
| `404` | No contact exists with that email, or `listId` doesn't exist. |
| `429` | Rate limit exceeded — see **Rate limiting** below. |

## `POST /api/v1/contacts/{email}/remove-tags`

Removes one or more tags from a contact. Each tag must exist (404 if any is unknown). No error if the contact didn't have a particular tag to begin with; the remove is idempotent per tag.

The contact must already exist (404 if not) — this endpoint never creates one as a side effect.

### Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `tagIds` | string[] (UUIDs) | yes | Existing tags' ids. `404` if any id doesn't exist. |

### Example

```bash
curl -X POST https://your-api-host/api/v1/contacts/jane%40example.com/remove-tags \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{ "tagIds": ["c1a2...-tag-1", "d4e5...-tag-2"] }'
```

URL-encode the email in the path (`@` → `%40`).

### Response — `201 Created`

```json
{
  "contactId": "b3f1c2b0-...-8e2a",
  "email": "jane@example.com",
  "removed": [
    { "tagId": "c1a2...-tag-1" },
    { "tagId": "d4e5...-tag-2" }
  ]
}
```

### Error responses

| Status | When |
|---|---|
| `400` | `tagIds` missing, not an array, or an element is not a valid UUID. |
| `401` | Missing, invalid, or expired `X-Api-Key`. |
| `404` | No contact exists with that email, or one of the `tagIds` doesn't exist. |
| `429` | Rate limit exceeded — see **Rate limiting** below. |

## `POST /api/v1/contacts/{email}/remove-all`

Removes the contact from **every** list they're in and **stops every** active/paused sequence enrollment — all in one call. Accepts an optional `reason` that's logged to the audit trail for each stopped enrollment.

The contact must already exist (404 if not).

### Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `reason` | string | no | Free-text reason for removal. Written to the audit log for every stopped sequence enrollment. |

### Example

```bash
curl -X POST https://your-api-host/api/v1/contacts/jane%40example.com/remove-all \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "GDPR data minimization request" }'
```

URL-encode the email in the path (`@` → `%40`).

### Response — `201 Created`

```json
{
  "contactId": "b3f1c2b0-...-8e2a",
  "email": "jane@example.com",
  "listsRemoved": 2,
  "sequencesStopped": 1,
  "stopped": [
    { "enrollmentId": "d4e2...-enr-1", "sequenceId": "a1b2...-seq-1" }
  ]
}
```

`listsRemoved` is the count of list memberships removed; `sequencesStopped` is the count of enrollments stopped. Both are `0` if the contact had nothing to remove.

### Error responses

| Status | When |
|---|---|
| `401` | Missing, invalid, or expired `X-Api-Key`. |
| `404` | No contact exists with that email. |
| `429` | Rate limit exceeded — see **Rate limiting** below. |

## Rate limiting

Every `/api/v1/*` request is capped at **60 requests/minute per key** (tracked by the raw `X-Api-Key` header value; unauthenticated/bad-key requests are tracked per source IP instead, so a flood of invalid keys is capped too). Exceeding it returns `429 Too Many Requests`. This is a basic flood guard, not per-endpoint tuning — if a legitimate integration needs a higher ceiling, that's a code change (`PublicApiModule`'s `ThrottlerModule.forRoot(...)` call), not a per-key setting today.

## Managing keys — `/api-keys` (JWT-authenticated, owner only)

These endpoints are for the app's own Settings UI — not intended for external callers, but documented for completeness. They use the normal logged-in-session auth (JWT), not `X-Api-Key`.

- `GET /api-keys` — list keys (name, prefix, expiry, last-used timestamp — never the key value itself).
- `POST /api-keys` — create a key. Body: `{ name, expiresAt? }` (ISO 8601 date-time; omit for a never-expiring key). Response includes `key` (the raw value) **once** — it is never returned by any other call.
- `POST /api-keys/:id/rotate` — issues a fresh key value for the same row (same name/expiry), immediately invalidating the old value. Response includes the new `key` once, same shape as create.
- `DELETE /api-keys/:id` — revoke (deletes) a key. Already-issued values stop working immediately.

## Notes

- A contact submitted with an email that's already suppressed still gets created/updated — suppression is checked at *send* time (per every list/campaign/sequence send), not at contact-creation time. Submitting a bounced/unsubscribed address here won't cause it to receive mail.
- Each key tracks a `lastUsedAt` timestamp (visible in the UI) so you can tell whether a given integration is actually calling in.
- Custom fields auto-created via `customFields` (see `POST /api/v1/contacts` above) show up in Settings > Custom fields exactly like ones created there directly — they're the same table, just populated from either place. An auto-created field defaults to `inputType: "text"`; if it needs a different type (`number`, `date`, `url`, `boolean`, `select`), edit it from Settings after the fact — the public API always creates as `text`.
