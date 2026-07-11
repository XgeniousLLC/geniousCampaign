import { pgTable, pgEnum, uuid, text, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const contactStatusEnum = pgEnum('contact_status', [
  'active',
  'unsubscribed',
  'bounced',
  'suppressed',
]);

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    customFields: jsonb('custom_fields').notNull().default({}),
    status: contactStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('contacts_email_unique_idx').on(table.email)],
);
