import { pgTable, pgEnum, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const errorLogSourceEnum = pgEnum('error_log_source', ['frontend', 'backend']);

// Debug log — unexpected errors only (unhandled backend exceptions, frontend
// render/runtime errors), not routine 4xx validation responses. Populated by
// the global exception filter (backend) and window.onerror/ErrorBoundary
// (frontend), read by the Settings > Debug log admin page.
export const errorLogs = pgTable('error_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: errorLogSourceEnum('source').notNull(),
  message: text('message').notNull(),
  stack: text('stack'),
  path: text('path'),
  context: jsonb('context').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
