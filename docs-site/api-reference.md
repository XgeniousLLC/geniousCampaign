# Public API reference

Developer reference for the external-facing REST surface — a website contact form, Zapier/Make, or a custom script can push contacts into Genius Campaign using a bearer API key. This is separate from the inbound webhook framework (HMAC-signed, generic field mapping, fires triggers) — the public API is purpose-built for one thing: create/update a contact, optionally into a list and/or with tags, with a simpler auth story (a static header, no signature to compute).

For how to create/rotate/revoke a key from the UI, see [API & integrations](user-manual/api-and-integrations.md). This page is the endpoint-level contract: request/response shape, status codes, rate limits.

## Authentication

Every `/api/v1/*` request needs an `X-Api-Key` header:

```
X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Missing, invalid, or expired keys → `401`.

### Default list/tags

A key can carry a `defaultListId`/`defaultTagIds` — every contact submitted through that key lands there automatically, **in addition to** whatever `listId`/`tagIds` the request itself specifies (merged, not replaced).

---

## `POST /api/v1/contacts`

Creates a new contact, or updates the existing one if the email already exists — upsert by email, never errors on a duplicate.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | Must be a valid email address |
| `firstName` | string | no | |
| `lastName` | string | no | |
| `customFields` | object | no | Key/value pairs, merged into existing custom fields on update. Each key is matched against an existing custom field's key (Settings > Custom fields); no match auto-creates one (as a `text` field, label derived from the key). Keys are slugified the same way the Settings UI does (lowercased, non-alphanumerics collapsed to `_`), so `"Favorite Color"` and `"favorite_color"` resolve to the same field |
| `listId` | string (UUID) | no | Existing list id. Added on top of the key's default list. `404` if it doesn't exist |
| `tagIds` | string[] (UUID) | no | Existing tag ids. Added on top of the key's default tags. `404` if any id doesn't exist |

**Request example**

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

**Response — `201 Created`**

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

**Errors**

| Status | When |
|---|---|
| `400` | `email` missing/invalid, or a malformed field (e.g. `tagIds` not an array of UUIDs) |
| `401` | Missing, invalid, or expired `X-Api-Key` |
| `404` | `listId` or one of `tagIds` was included but doesn't exist |
| `429` | Rate limit exceeded — see [Rate limiting](#rate-limiting) |

---

## `POST /api/v1/contacts/{email}/enroll`

Enrolls an existing contact into a sequence — the same state transition as enrolling from the sequence's UI or an inbound webhook trigger, just reached with a bearer key. The contact must already exist — this endpoint never creates one as a side effect.

Every sequence has an on/off switch (the "Enable/Disable sequence" button on its page, or the toggle on the Sequences list). A disabled sequence rejects all new enrollments — manual, this API, and trigger-driven alike — with a `409`; it doesn't affect contacts already enrolled.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `sequenceId` | string (UUID) | yes | Existing, enabled sequence id. `404` if it doesn't exist, `409` if disabled |

**Request example**

```bash
curl -X POST https://your-api-host/api/v1/contacts/jane%40example.com/enroll \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{ "sequenceId": "a1b2c3d4-...-seq-1" }'
```

URL-encode the email in the path (`@` → `%40`).

**Response — `201 Created`**

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

`status` is `"completed"` with `currentStepId: null` for a zero-step or wait-only sequence — nothing to run, so the enrollment is created and immediately marked done.

**Errors**

| Status | When |
|---|---|
| `400` | `sequenceId` missing or not a valid UUID |
| `401` | Missing, invalid, or expired `X-Api-Key` |
| `404` | No contact exists with that email, or `sequenceId` doesn't exist |
| `409` | The contact already has an active or paused enrollment in that sequence, or the sequence is disabled |
| `429` | Rate limit exceeded — see [Rate limiting](#rate-limiting) |

---

## `POST /api/v1/contacts/{email}/stop-sequences`

Stops every **active or paused** sequence enrollment for the contact with this email, across every sequence they're enrolled in, in one call. The contact must already exist — this endpoint never creates one as a side effect (unlike `POST /api/v1/contacts`, which upserts).

**Request example**

```bash
curl -X POST https://your-api-host/api/v1/contacts/jane%40example.com/stop-sequences \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

URL-encode the email in the path (`@` → `%40`).

**Response — `201 Created`**

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

`stopped` is `[]` if the contact had no active/paused enrollments — not an error, the correct "nothing to stop" outcome. Already-`completed`/already-`stopped` enrollments are left untouched.

**Errors**

| Status | When |
|---|---|
| `401` | Missing, invalid, or expired `X-Api-Key` |
| `404` | No contact exists with that email |
| `429` | Rate limit exceeded — see [Rate limiting](#rate-limiting) |

---

## `GET /api/v1/contacts/{email}`

Returns the full contact profile — tags, lists, and sequence enrollments — so an external tool can inspect a contact and then modify its associations using the sibling `remove-*` endpoints. The contact must already exist (`404` if not).

**Request example**

```bash
curl https://your-api-host/api/v1/contacts/jane%40example.com \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

URL-encode the email in the path (`@` → `%40`).

**Response — `200 OK`**

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

`sequences[].status` is one of `active`, `paused`, `stopped`, or `completed` — the same per-enrollment states used throughout the app (no shared sequence-wide clock).

**Errors**

| Status | When |
|---|---|
| `401` | Missing, invalid, or expired `X-Api-Key` |
| `404` | No contact exists with that email |
| `429` | Rate limit exceeded — see [Rate limiting](#rate-limiting) |

---

## `POST /api/v1/contacts/{email}/remove-sequence`

Stops the contact's enrollment in a specific sequence and records an optional reason in the audit trail. Same state transition as stopping an enrollment from the sequence's UI or an inbound webhook. The contact must already exist (`404` if not). The enrollment must be active or paused (`404` if the contact has no enrollment in this sequence, `409` if already stopped/completed).

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `sequenceId` | string (UUID) | yes | An existing sequence's id. `404` if it doesn't exist |
| `reason` | string | no | Free-text reason for removal. Written to the audit log for traceability |

**Request example**

```bash
curl -X POST https://your-api-host/api/v1/contacts/jane%40example.com/remove-sequence \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{ "sequenceId": "a1b2c3d4-...-seq-1", "reason": "Contact opted out" }'
```

URL-encode the email in the path (`@` → `%40`).

**Response — `201 Created`**

```json
{
  "enrollmentId": "d4e2...-enr-1",
  "contactId": "b3f1c2b0-...-8e2a",
  "email": "jane@example.com",
  "sequenceId": "a1b2c3d4-...-seq-1",
  "status": "stopped"
}
```

**Errors**

| Status | When |
|---|---|
| `400` | `sequenceId` missing or not a valid UUID |
| `401` | Missing, invalid, or expired `X-Api-Key` |
| `404` | No contact exists with that email, `sequenceId` doesn't exist, or the contact has no active/paused enrollment in this sequence |
| `409` | The enrollment is already stopped or completed |
| `429` | Rate limit exceeded — see [Rate limiting](#rate-limiting) |

---

## `POST /api/v1/contacts/{email}/remove-list`

Removes a contact from a static list. The list must exist (`404` if not). No error if the contact was not already in the list — the remove is idempotent. The contact must already exist (`404` if not).

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `listId` | string (UUID) | yes | An existing list's id. `404` if it doesn't exist |

**Request example**

```bash
curl -X POST https://your-api-host/api/v1/contacts/jane%40example.com/remove-list \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{ "listId": "b2a1...-list-1" }'
```

URL-encode the email in the path (`@` → `%40`).

**Response — `201 Created`**

```json
{
  "contactId": "b3f1c2b0-...-8e2a",
  "email": "jane@example.com",
  "listId": "b2a1...-list-1"
}
```

**Errors**

| Status | When |
|---|---|
| `400` | `listId` missing or not a valid UUID |
| `401` | Missing, invalid, or expired `X-Api-Key` |
| `404` | No contact exists with that email, or `listId` doesn't exist |
| `429` | Rate limit exceeded — see [Rate limiting](#rate-limiting) |

---

## `POST /api/v1/contacts/{email}/remove-tags`

Removes one or more tags from a contact. Each tag must exist (`404` if any is unknown). No error if the contact didn't have a particular tag to begin with — the remove is idempotent per tag. The contact must already exist (`404` if not).

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `tagIds` | string[] (UUID) | yes | Existing tags' ids. `404` if any id doesn't exist |

**Request example**

```bash
curl -X POST https://your-api-host/api/v1/contacts/jane%40example.com/remove-tags \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{ "tagIds": ["c1a2...-tag-1", "d4e5...-tag-2"] }'
```

URL-encode the email in the path (`@` → `%40`).

**Response — `201 Created`**

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

**Errors**

| Status | When |
|---|---|
| `400` | `tagIds` missing, not an array, or an element is not a valid UUID |
| `401` | Missing, invalid, or expired `X-Api-Key` |
| `404` | No contact exists with that email, or one of the `tagIds` doesn't exist |
| `429` | Rate limit exceeded — see [Rate limiting](#rate-limiting) |

---

## `POST /api/v1/contacts/{email}/remove-all`

Removes the contact from **every** list they're in and **stops every** active/paused sequence enrollment — all in one call. Accepts an optional `reason` logged to the audit trail for each stopped enrollment. The contact must already exist (`404` if not).

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `reason` | string | no | Free-text reason for removal. Written to the audit log for every stopped enrollment |

**Request example**

```bash
curl -X POST https://your-api-host/api/v1/contacts/jane%40example.com/remove-all \
  -H "X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "GDPR data minimization request" }'
```

URL-encode the email in the path (`@` → `%40`).

**Response — `201 Created`**

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

`listsRemoved` and `sequencesStopped` are counts; both are `0` if the contact had nothing to remove.

**Errors**

| Status | When |
|---|---|
| `401` | Missing, invalid, or expired `X-Api-Key` |
| `404` | No contact exists with that email |
| `429` | Rate limit exceeded — see [Rate limiting](#rate-limiting) |

---

## Rate limiting

Every `/api/v1/*` request is capped at **60 requests/minute per key** (tracked by the raw `X-Api-Key` value; unauthenticated/bad-key requests are tracked per source IP instead, so a flood of invalid keys is capped too). Exceeding it → `429 Too Many Requests`. This is a flood guard, not per-endpoint tuning — a higher ceiling for a specific integration is a code change, not a per-key UI setting.

---

## Key management — `/api-keys` (session-authenticated, owner only)

For the app's own Settings UI, not external callers — documented for completeness. Uses the normal logged-in JWT session, not `X-Api-Key`.

| Method & path | Purpose |
|---|---|
| `GET /api-keys` | List keys (name, prefix, expiry, last-used timestamp — never the key value itself) |
| `POST /api-keys` | Create a key. Body: `{ name, expiresAt? }` (ISO 8601; omit for never-expiring). Response includes `key` (raw value) **once** |
| `POST /api-keys/:id/rotate` | Issue a fresh value for the same row (same name/expiry), invalidating the old value immediately. Response includes the new `key` once |
| `DELETE /api-keys/:id` | Revoke (delete) a key. Already-issued values stop working immediately |

---

## Notes

- A contact submitted with an already-suppressed email still gets created/updated — suppression is checked at *send* time, not at contact-creation time.
- Each key tracks `lastUsedAt` (visible in Settings > API keys) so you can tell whether an integration is actually calling in.
- Custom fields auto-created via `customFields` show up in Settings > Custom fields exactly like ones created there directly — same table, just populated from either place. Auto-created fields default to `inputType: "text"`; edit them from Settings after the fact for a different type (`number`, `date`, `url`, `boolean`, `select`).
