import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core';
import type { ConditionTree } from '@genius-campaign/shared';
import { sequences } from './sequences';
import { sequenceEnrollments } from './enrollments';
import { contacts } from './contacts';
import { senderAccounts } from './sender-accounts';

export const threadStatusEnum = pgEnum('thread_status', [
  'uncategorized',
  'interested',
  'not_interested',
  'meeting_booked',
  'out_of_office',
  'closed',
]);

export const threadStatusSourceEnum = pgEnum('thread_status_source', ['auto', 'manual', 'ai']);

export const emailThreads = pgTable(
  'email_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    providerThreadId: text('provider_thread_id').notNull().unique(),
    enrollmentId: uuid('enrollment_id').references(() => sequenceEnrollments.id, {
      onDelete: 'set null',
    }),
    sequenceId: uuid('sequence_id').references(() => sequences.id, { onDelete: 'set null' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    senderAccountId: uuid('sender_account_id').references(() => senderAccounts.id, {
      onDelete: 'set null',
    }),
    subject: text('subject'),
    status: threadStatusEnum('status').notNull().default('uncategorized'),
    statusSource: threadStatusSourceEnum('status_source').notNull().default('auto'),
    statusConfidence: text('status_confidence'),
    isFinished: boolean('is_finished').notNull().default(false),
    isRead: boolean('is_read').notNull().default(false),
    isStarred: boolean('is_starred').notNull().default(false),
    lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('email_threads_sender_inbound_idx').on(t.senderAccountId, t.lastInboundAt),
    index('email_threads_sequence_idx').on(t.sequenceId),
    index('email_threads_contact_idx').on(t.contactId),
  ],
);

export const emailMessageDirEnum = pgEnum('email_message_dir', ['out', 'in']);
export const emailMessages = pgTable(
  'email_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => emailThreads.id, { onDelete: 'cascade' }),
    providerMessageId: text('provider_message_id').notNull().unique(),
    dir: emailMessageDirEnum('dir').notNull(),
    fromEmail: text('from_email'),
    toEmail: text('to_email'),
    snippet: text('snippet'),
    bodyText: text('body_text'),
    bodyHtml: text('body_html'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('email_messages_thread_sent_idx').on(t.threadId, t.sentAt)],
);

export const scheduledReplyStatusEnum = pgEnum('scheduled_reply_status', ['pending', 'sent', 'cancelled']);

export const scheduledReplies = pgTable(
  'scheduled_replies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => emailThreads.id, { onDelete: 'cascade' }),
    html: text('html').notNull(),
    text: text('text').notNull(),
    cc: text('cc'),
    bcc: text('bcc'),
    sendAt: timestamp('send_at', { withTimezone: true }).notNull(),
    status: scheduledReplyStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('scheduled_replies_thread_idx').on(t.threadId)],
);

export const EMPTY_CONDITION_TREE: ConditionTree = {
  kind: 'group',
  combinator: 'and',
  children: [],
};

export const subsequences = pgTable(
  'subsequences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentSequenceId: uuid('parent_sequence_id')
      .notNull()
      .references(() => sequences.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    // AND/OR condition tree that must match before the prospect is routed.
    conditions: jsonb('conditions')
      .$type<ConditionTree>()
      .notNull()
      .default(EMPTY_CONDITION_TREE),
    childSequenceId: uuid('child_sequence_id')
      .notNull()
      .references(() => sequences.id, { onDelete: 'cascade' }),
    delayMs: text('delay_ms').notNull().default('0'),
    stopParent: boolean('stop_parent').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('subsequences_parent_idx').on(t.parentSequenceId),
    unique('subsequences_parent_child_unique').on(
      t.parentSequenceId,
      t.childSequenceId,
    ),
  ],
);
