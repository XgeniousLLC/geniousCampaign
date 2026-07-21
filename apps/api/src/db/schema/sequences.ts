import { pgTable, pgEnum, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { templates } from './templates';
import { senderAccounts } from './sender-accounts';

export const sequenceStepTypeEnum = pgEnum('sequence_step_type', ['send_email', 'wait', 'condition', 'exit']);
export const delayUnitEnum = pgEnum('delay_unit', ['minutes', 'hours', 'days']);

export const sequences = pgTable('sequences', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  // Per-sequence HMAC secret for its inbound enroll/pause/resume/stop
  // webhook (CLAUDE.md invariant 4 — never a bare token in the URL).
  webhookSecret: text('webhook_secret').notNull(),
  // Sequence-level on/off switch, same shape as triggers.isActive — blocks
  // NEW enrollments (manual, public API, and trigger-driven, since all three
  // funnel through EnrollmentService.enroll()) when false. Does not touch
  // already-running enrollments; that's the existing per-enrollment
  // pause/resume/stop path (invariant 1 — no shared sequence-wide clock).
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sequenceSteps = pgTable('sequence_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  sequenceId: uuid('sequence_id')
    .notNull()
    .references(() => sequences.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  type: sequenceStepTypeEnum('type').notNull(),
  templateId: uuid('template_id').references(() => templates.id, { onDelete: 'set null' }),
  delayValue: integer('delay_value'),
  delayUnit: delayUnitEnum('delay_unit'),
  // GC-130 — sender account override for send_email steps; null = auto-pick
  senderAccountId: uuid('sender_account_id').references(() => senderAccounts.id, { onDelete: 'set null' }),
  // GC-130 — from name override; falls back to account's displayName when unset
  fromName: text('from_name'),
  // GC-130 — reply-to override; nullable email
  replyTo: text('reply_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
