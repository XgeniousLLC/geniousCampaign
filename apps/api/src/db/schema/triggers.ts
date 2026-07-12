import { pgTable, uuid, text, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sequences } from './sequences';

export const triggers = pgTable('triggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  eventType: text('event_type').notNull(),
  // JSON-logic-style condition tree: leaf { field, op, value } or
  // group { op: 'and'|'or', conditions: [...] }.
  conditions: jsonb('conditions').notNull(),
  sequenceId: uuid('sequence_id')
    .notNull()
    .references(() => sequences.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').notNull().default(true),
  // Set only when eventType === 'schedule' (GC-036): standard 5-field cron
  // pattern evaluated in scheduleTimezone via BullMQ's native repeatable-job
  // cron+tz support (invariant 10 — no custom cron matching/setTimeout loop).
  scheduleCron: text('schedule_cron'),
  scheduleTimezone: text('schedule_timezone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
