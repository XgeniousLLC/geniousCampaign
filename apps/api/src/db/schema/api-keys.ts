import { pgTable, uuid, text, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { lists } from './lists';
import { users } from './users';

// The public API surface (POST /api/v1/contacts) is authenticated by a
// bearer key, not JWT — a separate mechanism from the HMAC-signed inbound
// webhooks (CLAUDE.md invariant 4 covers those specifically). Only the
// sha256 hash is ever stored; the raw key is shown once at creation time,
// same "reveal-once" shape as a webhook endpoint's secret.
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    keyHash: text('key_hash').notNull(),
    // Applied to every contact submitted through this key, in addition to
    // any listId/tagIds the request body itself specifies — this is what
    // lets a single key represent "this form always drops into list X with
    // tags Y, Z" without the caller having to know any internal ids beyond
    // whatever the request needs to add on top.
    defaultListId: uuid('default_list_id').references(() => lists.id, { onDelete: 'set null' }),
    defaultTagIds: jsonb('default_tag_ids').notNull().default([]),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('api_keys_key_hash_unique_idx').on(table.keyHash)],
);
