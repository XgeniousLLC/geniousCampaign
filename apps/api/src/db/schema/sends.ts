import { pgTable, pgEnum, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { contacts } from './contacts';
import { templates } from './templates';
import { lists } from './lists';
import { sequences, sequenceSteps } from './sequences';
import { sequenceEnrollments } from './enrollments';

export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'sending', 'sent', 'failed']);

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => templates.id, { onDelete: 'restrict' }),
  listId: uuid('list_id')
    .notNull()
    .references(() => lists.id, { onDelete: 'restrict' }),
  status: campaignStatusEnum('status').notNull().default('draft'),
  sentCount: integer('sent_count').notNull().default(0),
  failedCount: integer('failed_count').notNull().default(0),
  suppressedCount: integer('suppressed_count').notNull().default(0),
  isDryRun: boolean('is_dry_run').notNull().default(false),
  // When set, every recipient's resolved email is sent to this address
  // instead of their real one (GC-052 send-to-self) — a real send (quota
  // still consumed), just redirected, distinct from isDryRun which never
  // sends at all.
  sendToEmail: text('send_to_email'),
  // GC-053 — a send above the configurable large-send threshold requires
  // this to be explicitly set before CampaignsService.send() will enqueue it.
  largeSendConfirmed: boolean('large_send_confirmed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sendProviderEnum = pgEnum('send_provider', ['ses', 'gmail']);
export const sendStatusEnum = pgEnum('send_status', ['sent', 'failed', 'suppressed', 'bounced', 'complained']);

export const sends = pgTable('sends', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id')
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').references(() => templates.id, { onDelete: 'set null' }),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  sequenceEnrollmentId: uuid('sequence_enrollment_id').references(() => sequenceEnrollments.id, {
    onDelete: 'set null',
  }),
  sequenceId: uuid('sequence_id').references(() => sequences.id, { onDelete: 'set null' }),
  sequenceStepId: uuid('sequence_step_id').references(() => sequenceSteps.id, { onDelete: 'set null' }),
  provider: sendProviderEnum('provider').notNull().default('ses'),
  providerMessageId: text('provider_message_id'),
  resolvedSubject: text('resolved_subject').notNull(),
  resolvedBodyHtml: text('resolved_body_html').notNull(),
  resolvedBodyText: text('resolved_body_text').notNull(),
  status: sendStatusEnum('status').notNull(),
  error: text('error'),
  isDryRun: boolean('is_dry_run').notNull().default(false),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const emailEventTypeEnum = pgEnum('email_event_type', ['open', 'click', 'bounce', 'complaint']);

export const emailEvents = pgTable('email_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  sendId: uuid('send_id')
    .notNull()
    .references(() => sends.id, { onDelete: 'cascade' }),
  type: emailEventTypeEnum('type').notNull(),
  url: text('url'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
