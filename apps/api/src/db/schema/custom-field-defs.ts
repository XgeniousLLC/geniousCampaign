import { pgTable, pgEnum, uuid, text, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const customFieldInputTypeEnum = pgEnum('custom_field_input_type', ['text', 'number', 'date', 'url', 'boolean', 'select']);

export const customFieldDefs = pgTable(
  'custom_field_defs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    label: text('label').notNull(),
    inputType: customFieldInputTypeEnum('input_type').notNull().default('text'),
    // Only meaningful for inputType === 'select' — the list of choices.
    options: jsonb('options').$type<string[]>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('custom_field_defs_key_unique_idx').on(table.key)],
);
