import { pgTable, pgEnum, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { sequences, sequenceSteps } from './sequences';
import { contacts } from './contacts';
import { senderAccounts } from './sender-accounts';

export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'paused', 'stopped', 'completed']);

export const sequenceEnrollments = pgTable('sequence_enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  sequenceId: uuid('sequence_id')
    .notNull()
    .references(() => sequences.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id')
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  status: enrollmentStatusEnum('status').notNull().default('active'),
  currentStepId: uuid('current_step_id').references(() => sequenceSteps.id, { onDelete: 'set null' }),
  // Sticky sender: the account that sent this enrollment's first step sends
  // every later step too. Null until the first send_email executes.
  senderAccountId: uuid('sender_account_id').references(() => senderAccounts.id, { onDelete: 'set null' }),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
