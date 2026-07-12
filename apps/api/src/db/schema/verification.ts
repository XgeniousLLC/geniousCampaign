import { pgTable, pgEnum, uuid, text, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const verificationStatusEnum = pgEnum('verification_status', [
  'valid',
  'invalid',
  'risky',
  'unknown',
]);

export const verificationProviderEnum = pgEnum('verification_provider', ['reoon', 'neverbounce']);

export const verificationResults = pgTable(
  'verification_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    status: verificationStatusEnum('status').notNull(),
    isDeliverable: boolean('is_deliverable').notNull(),
    provider: verificationProviderEnum('provider').notNull(),
    checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
    // 6-12 month TTL per GC-049 — re-verifying before this expires is
    // served from cache, no paid API call.
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex('verification_results_email_unique_idx').on(table.email)],
);
