# Public API

A small REST surface for external tools (a website contact form, Zapier/Make, a custom script) to push contacts into geniusCampaign — auth is a bearer API key, not a login session. This is separate from the [inbound webhook framework](../CLAUDE.md) (HMAC-signed, generic payload mapping, fires triggers) — the public API is purpose-built for one thing: "create or update a contact, optionally into a list and/or with tags," with a simpler auth story that's easier for arbitrary external tools to call (a static header value, no signature to compute).

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
| `customFields` | object | no | Arbitrary key/value pairs, merged into the contact's existing custom fields on update. |
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

### Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `sequenceId` | string (UUID) | yes | An existing sequence's id. `404` if it doesn't exist. |

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
| `409` | The contact already has an active or paused enrollment in that sequence. |
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
