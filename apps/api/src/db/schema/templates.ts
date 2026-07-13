import { pgTable, uuid, text, jsonb, integer, timestamp, type AnyPgColumn } from 'drizzle-orm/pg-core';

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  subject: text('subject').notNull().default(''),
  bodyJson: jsonb('body_json').notNull(),
  bodyHtml: text('body_html').notNull().default(''),
  bodyText: text('body_text').notNull().default(''),
  folder: text('folder'),
  // Set when this row is a saved shuffle/AI variant of another template
  // (subject+body copy only, not a real workflow feature) — variants are
  // excluded from the default GET /templates list but remain real, sendable
  // template rows (selectable in campaign compose via ?includeVariants=true).
  parentTemplateId: uuid('parent_template_id').references((): AnyPgColumn => templates.id, { onDelete: 'cascade' }),
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
