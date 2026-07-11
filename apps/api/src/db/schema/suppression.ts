import { pgTable, pgEnum, uuid, text, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const suppressionReasonEnum = pgEnum('suppression_reason', [
  'hard_bounce',
  'complaint',
  'manual_unsubscribe',
  'repeated_soft_bounce',
]);

export const suppressionList = pgTable(
  'suppression_list',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    reason: suppressionReasonEnum('reason').notNull(),
    source: text('source').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('suppression_list_email_unique_idx').on(table.email)],
);

// Soft/transient bounces only suppress after repeated occurrences
// (CLAUDE.md architectural invariant 8) — this tracks the running count.
export const softBounceCounts = pgTable(
  'soft_bounce_counts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    count: integer('count').notNull().default(1),
    lastBouncedAt: timestamp('last_bounced_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('soft_bounce_counts_email_unique_idx').on(table.email)],
);
