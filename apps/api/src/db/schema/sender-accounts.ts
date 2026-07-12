import { pgTable, pgEnum, uuid, text, integer, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const senderProviderEnum = pgEnum('sender_provider', ['ses', 'gmail']);

export const senderAccounts = pgTable(
  'sender_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: senderProviderEnum('provider').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name'),
    dailySendLimit: integer('daily_send_limit').notNull(),
    sentToday: integer('sent_today').notNull().default(0),
    // Reset sentToday to 0 the first time a send lands after this date
    // flips — avoids a separate cron just to zero counters at midnight.
    sentTodayDate: text('sent_today_date').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    // AES-256-GCM ciphertext (iv:authTag:ciphertext, base64) — never a raw
    // refresh token at rest. Only set for provider: 'gmail'.
    gmailRefreshTokenEncrypted: text('gmail_refresh_token_encrypted'),
    gmailLastBounceScanAt: timestamp('gmail_last_bounce_scan_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('sender_accounts_email_unique_idx').on(table.email)],
);
