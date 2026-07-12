import { pgTable, uuid, integer, doublePrecision, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

// One row per evaluation cycle (GC-050) — history, not a single mutable
// singleton, so a tripped breaker's cause is auditable after the fact.
export const breakerEvaluations = pgTable('breaker_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  windowSize: integer('window_size').notNull(),
  bounceOrComplaintCount: integer('bounce_or_complaint_count').notNull(),
  totalCount: integer('total_count').notNull(),
  ratePct: doublePrecision('rate_pct').notNull(),
  thresholdPct: doublePrecision('threshold_pct').notNull(),
  tripped: boolean('tripped').notNull(),
  pausedEnrollmentCount: integer('paused_enrollment_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// A manual reset clears the trip — sends stay blocked until an owner
// explicitly reviews and resets, never auto-heals (ticket: "flags for
// review").
export const breakerResets = pgTable('breaker_resets', {
  id: uuid('id').primaryKey().defaultRandom(),
  resetByUserId: uuid('reset_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
