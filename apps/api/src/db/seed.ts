import { config } from 'dotenv';
config({ path: ['../../.env', '.env'] });

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

// Dummy data generator for local dev/testing — run with `npm run db:seed`.
// Safe to re-run: contacts/tags/lists are matched by unique name/email and
// skipped if already present, campaigns/sends/events are only added on top.

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery', 'Drew', 'Reese', 'Sam', 'Quinn', 'Harper', 'Rowan', 'Skyler', 'Dana', 'Emerson', 'Blake', 'Charlie', 'Kendall'];
const LAST_NAMES = ['Chen', 'Patel', 'Garcia', 'Smith', 'Kim', 'Nguyen', 'Johnson', 'Brown', 'Davis', 'Martinez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Moore', 'Jackson', 'White', 'Harris', 'Clark', 'Lewis'];
const DOMAINS = ['acme.com', 'globex.io', 'initech.com', 'umbrella.co', 'soylent.dev', 'hooli.com', 'stark.io', 'wayne.enterprises'];
const COMPANIES = ['Acme Corp', 'Globex', 'Initech', 'Umbrella Co', 'Soylent', 'Hooli', 'Stark Industries', 'Wayne Enterprises'];

const TAG_DEFS = [
  { name: 'Customer', color: '#34D399' },
  { name: 'Lead', color: '#818CF8' },
  { name: 'VIP', color: '#FBBF24' },
  { name: 'Newsletter', color: '#60A5FA' },
  { name: 'Trial', color: '#A78BFA' },
  { name: 'Churned', color: '#FB923C' },
  { name: 'Partner', color: '#38BDF8' },
  { name: 'Investor', color: '#F472B6' },
];

const LIST_DEFS = [
  { name: 'All Newsletter Subscribers', type: 'static' as const },
  { name: 'Q3 Product Launch', type: 'static' as const },
  { name: 'Active Customers (30d)', type: 'dynamic' as const, filterDefinition: { status: 'active' } },
  { name: 'Enterprise Prospects', type: 'static' as const },
  { name: 'Re-engagement Target', type: 'dynamic' as const, filterDefinition: { lastActivityBefore: '30d' } },
];

const TEMPLATE_DEFS = [
  { name: 'Welcome Email', subject: 'Welcome to {{contact.company}}!' },
  { name: 'Product Launch Announcement', subject: "It's here: our biggest release yet" },
  { name: 'Re-engagement Nudge', subject: 'We miss you, {{contact.firstName}}' },
  { name: 'Monthly Newsletter', subject: 'This month at a glance' },
  { name: 'Case Study Share', subject: 'How {{contact.company}} could 2x conversions' },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Seeding tags...');
  const tagRows = [];
  for (const t of TAG_DEFS) {
    const existing = await db.query.tags.findFirst({ where: (tbl, { eq }) => eq(tbl.name, t.name) });
    if (existing) {
      tagRows.push(existing);
      continue;
    }
    const [created] = await db.insert(schema.tags).values(t).returning();
    tagRows.push(created);
  }

  console.log('Seeding lists...');
  const listRows = [];
  for (const l of LIST_DEFS) {
    const existing = await db.query.lists.findFirst({ where: (tbl, { eq }) => eq(tbl.name, l.name) });
    if (existing) {
      listRows.push(existing);
      continue;
    }
    const [created] = await db.insert(schema.lists).values(l).returning();
    listRows.push(created);
  }

  console.log('Seeding contacts...');
  const contactRows = [];
  const targetContactCount = 70;
  const existingCount = await db.$count(schema.contacts);
  const toCreate = Math.max(0, targetContactCount - existingCount);
  for (let i = 0; i < toCreate; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const domainIdx = randomInt(0, DOMAINS.length - 1);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@${DOMAINS[domainIdx]}`;
    const statusRoll = Math.random();
    const status = statusRoll < 0.78 ? 'active' : statusRoll < 0.88 ? 'unsubscribed' : statusRoll < 0.96 ? 'bounced' : 'suppressed';
    const [created] = await db
      .insert(schema.contacts)
      .values({
        email,
        firstName,
        lastName,
        status,
        customFields: { company: COMPANIES[domainIdx], title: pick(['Marketing Manager', 'Founder', 'Sales Director', 'Growth Lead', 'CTO']) },
        createdAt: daysAgo(randomInt(1, 120)),
      })
      .onConflictDoNothing()
      .returning();
    if (created) contactRows.push(created);
  }
  const allContacts = await db.query.contacts.findMany();

  console.log('Assigning tags & lists to contacts...');
  for (const contact of allContacts) {
    const tagCount = randomInt(0, 3);
    const shuffledTags = [...tagRows].sort(() => Math.random() - 0.5).slice(0, tagCount);
    for (const tag of shuffledTags) {
      await db.insert(schema.contactTags).values({ contactId: contact.id, tagId: tag.id }).onConflictDoNothing();
    }
    const listCount = randomInt(0, 2);
    const shuffledLists = [...listRows].sort(() => Math.random() - 0.5).slice(0, listCount);
    for (const list of shuffledLists) {
      await db.insert(schema.contactLists).values({ contactId: contact.id, listId: list.id }).onConflictDoNothing();
    }
  }

  console.log('Seeding templates...');
  const templateRows = [];
  for (const t of TEMPLATE_DEFS) {
    const existing = await db.query.templates.findFirst({ where: (tbl, { eq }) => eq(tbl.name, t.name) });
    if (existing) {
      templateRows.push(existing);
      continue;
    }
    const bodyHtml = `<p>Hi {{contact.firstName}},</p><p>${t.subject}</p>`;
    const [created] = await db
      .insert(schema.templates)
      .values({
        name: t.name,
        subject: t.subject,
        bodyJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: t.subject }] }] },
        bodyHtml,
        bodyText: t.subject,
      })
      .returning();
    templateRows.push(created);
  }

  console.log('Seeding campaigns + sends + email events (last 30 days)...');
  const campaignNames = ['July Product Update', 'Summer Sale Blast', 'Webinar Invite', 'Feature Spotlight: Automations', 'Customer Stories Roundup', 'Beta Access Announcement'];
  const statuses: Array<'draft' | 'sending' | 'sent' | 'failed'> = ['sent', 'sent', 'sent', 'sending', 'draft', 'failed'];

  for (let i = 0; i < campaignNames.length; i++) {
    const name = campaignNames[i];
    const existing = await db.query.campaigns.findFirst({ where: (tbl, { eq }) => eq(tbl.name, name) });
    if (existing) continue;

    const template = pick(templateRows);
    const list = pick(listRows);
    const status = statuses[i];
    const createdAt = daysAgo(randomInt(1, 29));

    const [campaign] = await db
      .insert(schema.campaigns)
      .values({ name, templateId: template.id, listIds: [list.id], status, createdAt, updatedAt: createdAt })
      .returning();

    if (status === 'draft') continue;

    const recipients = [...allContacts].sort(() => Math.random() - 0.5).slice(0, randomInt(15, 40));
    let sentCount = 0;
    let failedCount = 0;

    for (const contact of recipients) {
      const sentAt = new Date(createdAt.getTime() + randomInt(0, 2) * 60 * 60 * 1000);
      const roll = Math.random();
      const sendStatus = status === 'failed' && roll < 0.4 ? 'failed' : roll < 0.05 ? 'bounced' : roll < 0.08 ? 'failed' : 'sent';
      if (sendStatus === 'sent') sentCount++;
      else failedCount++;

      const [send] = await db
        .insert(schema.sends)
        .values({
          contactId: contact.id,
          templateId: template.id,
          campaignId: campaign.id,
          provider: 'ses',
          resolvedSubject: template.subject,
          resolvedBodyHtml: template.bodyHtml,
          resolvedBodyText: template.bodyText,
          status: sendStatus,
          sentAt: sendStatus === 'sent' ? sentAt : null,
          createdAt: sentAt,
        })
        .returning();

      if (sendStatus !== 'sent') continue;

      if (Math.random() < 0.42) {
        await db.insert(schema.emailEvents).values({
          sendId: send.id,
          type: 'open',
          createdAt: new Date(sentAt.getTime() + randomInt(1, 6) * 60 * 60 * 1000),
        });
        if (Math.random() < 0.35) {
          await db.insert(schema.emailEvents).values({
            sendId: send.id,
            type: 'click',
            url: 'https://geniuscampaign.app/pricing',
            createdAt: new Date(sentAt.getTime() + randomInt(2, 10) * 60 * 60 * 1000),
          });
        }
      }
      if (Math.random() < 0.02) {
        await db.insert(schema.emailEvents).values({ sendId: send.id, type: 'bounce', createdAt: sentAt });
      }
    }

    await db.update(schema.campaigns).set({ sentCount, failedCount }).where(eq(schema.campaigns.id, campaign.id));
  }

  console.log('Done seeding.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
