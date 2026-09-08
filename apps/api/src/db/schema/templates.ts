import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  // Multiple subject lines — one is picked at random per send (resolved once,
  // stored on the sends row, same evidentiary spirit as spintax; CLAUDE.md
  // invariant 5, extended via resolveTemplateContent() in @genius-campaign/shared).
  subjectLines: jsonb('subject_lines').$type<string[]>().notNull().default([]),
  // Preheader/preview-text lines — same shuffle pattern as subjectLines, but
  // an empty array is valid (no preview text set).
  previewTextLines: jsonb('preview_text_lines')
    .$type<string[]>()
    .notNull()
    .default([]),
  bodyJson: jsonb('body_json').notNull(),
  bodyHtml: text('body_html').notNull().default(''),
  bodyText: text('body_text').notNull().default(''),
  folder: text('folder'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const templateVersions = pgTable('template_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => templates.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  name: text('name').notNull(),
  subjectLines: jsonb('subject_lines').$type<string[]>().notNull().default([]),
  previewTextLines: jsonb('preview_text_lines')
    .$type<string[]>()
    .notNull()
    .default([]),
  bodyJson: jsonb('body_json').notNull(),
  bodyHtml: text('body_html').notNull(),
  bodyText: text('body_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
