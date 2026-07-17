# Public API

A small REST surface for external tools (a website contact form, Zapier/Make, a custom script) to push contacts into geniusCampaign — auth is a bearer API key, not a login session. This is separate from the [inbound webhook framework](../CLAUDE.md) (HMAC-signed, generic payload mapping, fires triggers) — the public API is purpose-built for one thing: "create or update a contact, optionally into a list and/or with tags," with a simpler auth story that's easier for arbitrary external tools to call (a static header value, no signature to compute).

## Authentication

Every request needs an `X-Api-Key` header. Create a key from **Webhooks > API keys** in the app (owner role required) — the raw key is shown exactly once, at creation time. If you lose it, revoke it and create a new one; there's no way to retrieve a key's value again.

```
X-Api-Key: gcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Missing or invalid keys get a `401`.

### Default list/tags

Each key can optionally be configured (at creation time, in the UI) with a **default list** and **default tags** — every contact submitted through that key lands in that list/those tags automatically, without the caller having to know or send any internal IDs. This is the intended shape for "one API key per form" — a website's contact form key always drops submissions into the same "Website Leads" list with a "Website" tag, and the form itself only ever needs to POST `{ email, firstName, lastName }`.

A request can also specify `listId`/`tagIds` directly (see below) — these are **added on top of** the key's defaults, not a replacement for them.

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

### Response — `200 OK`

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
| `401` | Missing or invalid `X-Api-Key`. |
| `404` | `listId` or one of `tagIds` was included in the request but doesn't exist. |

## Managing keys — `/api-keys` (JWT-authenticated, owner only)

These endpoints are for the app's own Settings UI — not intended for external callers, but documented for completeness. They use the normal logged-in-session auth (JWT), not `X-Api-Key`.

- `GET /api-keys` — list keys (name, prefix, default list/tags, last-used timestamp — never the key value itself).
- `POST /api-keys` — create a key. Body: `{ name, defaultListId?, defaultTagIds? }`. Response includes `key` (the raw value) **once** — it is never returned by any other call.
- `DELETE /api-keys/:id` — revoke (deletes) a key. Already-issued values stop working immediately.

## Notes

- A contact submitted with an email that's already suppressed still gets created/updated — suppression is checked at *send* time (per every list/campaign/sequence send), not at contact-creation time. Submitting a bounced/unsubscribed address here won't cause it to receive mail.
- There's no rate limiting on this endpoint today — keep that in mind if wiring up something that could burst (e.g. a bulk import script) rather than trickle in one submission at a time.
- Each key tracks a `lastUsedAt` timestamp (visible in the UI) so you can tell whether a given integration is actually calling in.
