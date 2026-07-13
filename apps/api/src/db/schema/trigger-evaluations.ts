import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { triggers } from './triggers';
import { contacts } from './contacts';

// One row per real trigger *match* (a "fire") — not every evaluation
// attempt. For event-driven triggers that's one row per real-world event
// that matched the condition tree; for schedule triggers it's one row per
// matched contact on that tick. Non-matches are cheap and not logged, same
// reasoning as webhook_deliveries logging real deliveries, not every
// incoming request everywhere.
export const triggerEvaluations = pgTable('trigger_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  triggerId: uuid('trigger_id')
    .notNull()
    .references(() => triggers.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id')
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  // false when enroll() was skipped because the contact already had an
  // active/paused enrollment in the target sequence (invariant 1) — a real
  // match that didn't result in a new enrollment, not a failure.
  enrolled: boolean('enrolled').notNull(),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
