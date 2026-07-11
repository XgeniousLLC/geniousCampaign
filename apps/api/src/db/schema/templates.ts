import { pgTable, uuid, text, jsonb, integer, timestamp } from 'drizzle-orm/pg-core';

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  subject: text('subject').notNull().default(''),
  bodyJson: jsonb('body_json').notNull(),
  bodyHtml: text('body_html').notNull().default(''),
  bodyText: text('body_text').notNull().default(''),
  folder: text('folder'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const templateVersions = pgTable('template_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => templates.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  bodyJson: jsonb('body_json').notNull(),
  bodyHtml: text('body_html').notNull(),
  bodyText: text('body_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
