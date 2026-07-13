import { pgTable, pgEnum, uuid, text, jsonb, timestamp, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';
import { contacts } from './contacts';

export const listTypeEnum = pgEnum('list_type', ['static', 'dynamic']);

export const lists = pgTable('lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: listTypeEnum('type').notNull().default('static'),
  filterDefinition: jsonb('filter_definition'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    color: text('color').notNull().default('#818CF8'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('tags_name_unique_idx').on(table.name)],
);

export const contactLists = pgTable(
  'contact_lists',
  {
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    listId: uuid('list_id')
      .notNull()
      .references(() => lists.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.contactId, table.listId] })],
);

export const contactTags = pgTable(
  'contact_tags',
  {
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.contactId, table.tagId] })],
);
