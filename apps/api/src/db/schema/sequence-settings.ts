import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sequences } from './sequences';

export const textOnlyModeEnum = pgEnum('text_only_mode', ['off', 'first_only', 'all']);
export const sendingPriorityEnum = pgEnum('sending_priority', [
  'followups',
  'new',
  'balanced',
  'aggressive',
]);
export const unsubFormatEnum = pgEnum('unsub_format', ['text', 'link']);

export const sendingSchedules = pgTable('sending_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  // 7 booleans Mon..Sun
  days: boolean('days').array().notNull().default([true, true, true, true, true, false, false]),
  startMin: integer('start_min').notNull().default(540),
  endMin: integer('end_min').notNull().default(1020),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sequenceSettings = pgTable('sequence_settings', {
  sequenceId: uuid('sequence_id')
    .primaryKey()
    .references(() => sequences.id, { onDelete: 'cascade' }),
  stopOnReply: boolean('stop_on_reply').notNull().default(true),
  trackOpen: boolean('track_open').notNull().default(true),
  trackClick: boolean('track_click').notNull().default(true),
  stripStyling: boolean('strip_styling').notNull().default(false),
  textOnlyMode: textOnlyModeEnum('text_only_mode').notNull().default('off'),
  triggerOnce: boolean('trigger_once').notNull().default(true),
  priority: sendingPriorityEnum('priority').notNull().default('followups'),
  dailyCap: integer('daily_cap'),
  enrollPerDay: integer('enroll_per_day'),
  scheduleId: uuid('schedule_id').references(() => sendingSchedules.id, {
    onDelete: 'set null',
  }),
  dealValue: integer('deal_value').notNull().default(0),
  verifyBeforeSend: boolean('verify_before_send').notNull().default(false),
  cc: text('cc'),
  bcc: text('bcc'),
  unsubFooter: boolean('unsub_footer').notNull().default(true),
  // "Unsubscribe as text/link" — how the opt-out is presented in the footer.
  unsubFormat: unsubFormatEnum('unsub_format').notNull().default('text'),
  // Plain-text footer message (text format). Null = default canned message.
  unsubMessage: text('unsub_message'),
  // Include the List-Unsubscribe header for one-click opt-out in the inbox.
  unsubHeader: boolean('unsub_header').notNull().default(true),
  // Auto-opt-out when a reply matches one of unsubKeywords ("stop", etc).
  unsubOnReply: boolean('unsub_on_reply').notNull().default(true),
  unsubKeywords: text('unsub_keywords').notNull().default('stop'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
