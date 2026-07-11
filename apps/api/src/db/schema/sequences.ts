import { pgTable, pgEnum, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { templates } from './templates';

export const sequenceStepTypeEnum = pgEnum('sequence_step_type', ['send_email', 'wait', 'condition', 'exit']);
export const delayUnitEnum = pgEnum('delay_unit', ['minutes', 'hours', 'days']);

export const sequences = pgTable('sequences', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
