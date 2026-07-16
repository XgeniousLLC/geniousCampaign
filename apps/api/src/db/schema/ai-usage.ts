import { pgTable, uuid, text, integer, doublePrecision, timestamp } from 'drizzle-orm/pg-core';

// One row per AI Assist call (GC-059 follow-up) — cost is computed at
// write time from the pricing table in effect when the call happened
// (model-pricing.ts), not recomputed later, so a rate change doesn't
// silently rewrite historical spend.
export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens').notNull(),
  completionTokens: integer('completion_tokens').notNull(),
  // Null when the model isn't in model-pricing.ts's table — shown as
  // "cost unknown" rather than guessed, since a wrong number is worse
  // than an honest gap for a cost-tracking feature.
  costUsd: doublePrecision('cost_usd'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
