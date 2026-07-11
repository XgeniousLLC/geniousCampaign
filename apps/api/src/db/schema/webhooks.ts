import { pgTable, uuid, text, jsonb, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const webhookEndpoints = pgTable(
  'webhook_endpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    secret: text('secret').notNull(),
    fieldMapping: jsonb('field_mapping').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('webhook_endpoints_slug_unique_idx').on(table.slug)],
);

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  webhookEndpointId: uuid('webhook_endpoint_id').references(() => webhookEndpoints.id, { onDelete: 'set null' }),
  slug: text('slug').notNull(),
  signatureValid: boolean('signature_valid').notNull(),
  statusCode: text('status_code'),
  payload: jsonb('payload'),
  headers: jsonb('headers'),
  error: text('error'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
});
