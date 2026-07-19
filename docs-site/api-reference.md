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
| `customFields` | object | no | Arbitrary key/value pairs, merged into existing custom fields on update |
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
