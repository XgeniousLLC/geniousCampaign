import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// A DB-backed override of specific credential env vars (AWS/R2/AI/etc),
// set via the Settings > Integrations UI (GC-071) — value is always
// AES-256-GCM encrypted at rest (see settings/settings.service.ts), never
// stored in plaintext. Presence of a row here takes priority over the
// matching process.env value; deleting the row falls back to .env again.
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
