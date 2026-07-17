import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, inArray, sql, and, or, ilike, asc, desc } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { contacts, contactTags, tags, contactLists, lists, verificationResults, sends, emailEvents } from '../db/schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

export interface ContactsPageQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'unsubscribed' | 'bounced' | 'suppressed';
  listId?: string;
  sortKey?: 'name' | 'status' | 'lastActivityAt';
  sortDir?: 'asc' | 'desc';
}

@Injectable()
export class ContactsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly events: EventEmitter2,
  ) {}

  async create(dto: CreateContactDto) {
    const existing = await this.drizzle.db.query.contacts.findFirst({
      where: eq(contacts.email, dto.email),
    });
    if (existing) {
      throw new ConflictException(`A contact with email "${dto.email}" already exists`);
    }

    const [created] = await this.drizzle.db
      .insert(contacts)
      .values({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        customFields: dto.customFields ?? {},
        status: dto.status ?? 'active',
      })
      .returning();
    this.events.emit('contact.created', { contactId: created.id, email: created.email });
    return created;
  }

  async findAll() {
    const all = await this.drizzle.db.query.contacts.findMany({ orderBy: (c, { desc }) => desc(c.createdAt) });
    return this.hydrate(all);
  }

  /** GC-118: the contacts admin page was fetching and joining every contact
   * on every load (`findAll()` above) — fine at dozens of rows, a 10s+ page
   * load at 7k+ (found live: seeded 10k contacts + 30k sends locally to
   * reproduce). This does the actual work — filtering, sorting, and
   * LIMIT/OFFSET — in SQL, then only runs the tags/lists/verification/
   * last-activity joins (the expensive part) against the current page's
   * ids, never the whole table. `findAll()` above is untouched and still
   * used by the handful of callers that need the full unpaginated list for
   * a picker/lookup (campaign compose, sequence builder, email log). */
  async findAllPaged(query: ContactsPageQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const offset = (page - 1) * limit;

    const listScope = query.listId
      ? sql`exists (select 1 from ${contactLists} where ${contactLists.contactId} = ${contacts.id} and ${contactLists.listId} = ${query.listId})`
      : undefined;

    const search = query.search?.trim();
    const searchCond = search
      ? or(
          ilike(contacts.email, `%${search}%`),
          ilike(contacts.firstName, `%${search}%`),
          ilike(contacts.lastName, `%${search}%`),
          sql`exists (select 1 from ${contactTags} inner join ${tags} on ${tags.id} = ${contactTags.tagId} where ${contactTags.contactId} = ${contacts.id} and ${tags.name} ilike ${`%${search}%`})`,
        )
      : undefined;

    const statusCond = query.status ? eq(contacts.status, query.status) : undefined;
    const conditions = [listScope, searchCond, statusCond].filter((c): c is NonNullable<typeof c> => c !== undefined);
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const nameExpr = sql`lower(coalesce(nullif(concat_ws(' ', ${contacts.firstName}, ${contacts.lastName}), ''), ${contacts.email}))`;
    const lastActivityExpr = sql`(select greatest(max(s.sent_at), max(ee.created_at)) from ${sends} s left join ${emailEvents} ee on ee.send_id = s.id where s.contact_id = ${contacts.id})`;
    const dirRaw = query.sortDir === 'desc' ? sql.raw('desc') : sql.raw('asc');
    // lastActivityAt is nullable (never-contacted contacts) — Postgres
    // defaults NULLS FIRST on DESC, which would float "never contacted"
    // above "most recently active". Nulls always sort to the end instead,
    // regardless of direction, since that's what "sort by activity" means.
    const orderBy =
      query.sortKey === 'name'
        ? query.sortDir === 'desc'
          ? desc(nameExpr)
          : asc(nameExpr)
        : query.sortKey === 'status'
          ? query.sortDir === 'desc'
            ? desc(contacts.status)
            : asc(contacts.status)
          : query.sortKey === 'lastActivityAt'
            ? sql`${lastActivityExpr} ${dirRaw} nulls last`
            : desc(contacts.createdAt);

    const [data, [{ count: total }], statusCountRows, [{ count: verifiedCount }]] = await Promise.all([
      this.drizzle.db.select().from(contacts).where(where).orderBy(orderBy).limit(limit).offset(offset),
      this.drizzle.db.select({ count: sql<number>`count(*)::int` }).from(contacts).where(where),
      // Status-chip counts intentionally ignore search/status — only the
      // listId scope — so they always show "how many of this scope", not
      // "how many match the current text filter too".
      this.drizzle.db.select({ status: contacts.status, count: sql<number>`count(*)::int` }).from(contacts).where(listScope).groupBy(contacts.status),
      this.drizzle.db
        .select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .innerJoin(verificationResults, and(eq(verificationResults.email, contacts.email), eq(verificationResults.status, 'valid')))
        .where(listScope),
    ]);

    const counts: Record<'all' | 'active' | 'unsubscribed' | 'bounced' | 'suppressed', number> = {
      all: 0,
      active: 0,
      unsubscribed: 0,
      bounced: 0,
      suppressed: 0,
    };
    for (const row of statusCountRows) {
      counts[row.status] = row.count;
      counts.all += row.count;
    }

    return { data: await this.hydrate(data), total, page, limit, counts, verifiedCount };
  }

  /** Batches tags/lists/verification-status/last-activity for a given set
   * of contact rows — shared by findAll() (whole table) and
   * findAllPaged() (one page), so the join logic only lives in one place. */
  private async hydrate(rows: (typeof contacts.$inferSelect)[]) {
    if (rows.length === 0) return [];

    const ids = rows.map((c) => c.id);
    const emails = rows.map((c) => c.email);

    const [tagRows, listRows, verifications, lastActivityRows] = await Promise.all([
      this.drizzle.db
        .select({ contactId: contactTags.contactId, id: tags.id, name: tags.name, color: tags.color })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .where(inArray(contactTags.contactId, ids)),
      this.drizzle.db
        .select({ contactId: contactLists.contactId, id: lists.id, name: lists.name })
        .from(contactLists)
        .innerJoin(lists, eq(contactLists.listId, lists.id))
        .where(inArray(contactLists.contactId, ids)),
      this.drizzle.db
        .select({ email: verificationResults.email, status: verificationResults.status })
        .from(verificationResults)
        .where(inArray(verificationResults.email, emails)),
      this.drizzle.db
        .select({
          contactId: sends.contactId,
          lastSentAt: sql<string | null>`max(${sends.sentAt})`,
          lastEventAt: sql<string | null>`max(${emailEvents.createdAt})`,
        })
        .from(sends)
        .leftJoin(emailEvents, eq(emailEvents.sendId, sends.id))
        .where(inArray(sends.contactId, ids))
        .groupBy(sends.contactId),
    ]);

    const tagsByContact = new Map<string, { id: string; name: string; color: string }[]>();
    for (const row of tagRows) {
      const list = tagsByContact.get(row.contactId) ?? [];
      list.push({ id: row.id, name: row.name, color: row.color });
      tagsByContact.set(row.contactId, list);
    }

    const listsByContact = new Map<string, { id: string; name: string }[]>();
    for (const row of listRows) {
      const list = listsByContact.get(row.contactId) ?? [];
      list.push({ id: row.id, name: row.name });
      listsByContact.set(row.contactId, list);
    }

    const verificationByEmail = new Map(verifications.map((v) => [v.email, v.status]));

    const lastActivityByContact = new Map<string, string | null>();
    for (const row of lastActivityRows) {
      const latest = [row.lastSentAt, row.lastEventAt].filter(Boolean).sort().pop() ?? null;
      lastActivityByContact.set(row.contactId, latest);
    }

    return rows.map((c) => ({
      ...c,
      tags: tagsByContact.get(c.id) ?? [],
      lists: listsByContact.get(c.id) ?? [],
      verificationStatus: verificationByEmail.get(c.email) ?? null,
      lastActivityAt: lastActivityByContact.get(c.id) ?? null,
    }));
  }

  async findOne(id: string) {
    const contact = await this.drizzle.db.query.contacts.findFirst({ where: eq(contacts.id, id) });
    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }
    return contact;
  }

  async findByEmail(email: string) {
    const contact = await this.drizzle.db.query.contacts.findFirst({ where: eq(contacts.email, email) });
    if (!contact) {
      throw new NotFoundException(`No contact with email "${email}"`);
    }
    return contact;
  }

  async update(id: string, dto: UpdateContactDto) {
    await this.findOne(id);

    if (dto.email) {
      const existing = await this.drizzle.db.query.contacts.findFirst({
        where: eq(contacts.email, dto.email),
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`A contact with email "${dto.email}" already exists`);
      }
    }

    const [updated] = await this.drizzle.db
      .update(contacts)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();

    for (const field of Object.keys(dto) as (keyof UpdateContactDto)[]) {
      this.events.emit('contact.field_changed', { contactId: id, field, value: dto[field] });
    }

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.drizzle.db.delete(contacts).where(eq(contacts.id, id));
    return { id };
  }

  /** One DB round trip regardless of selection size — unlike the other bulk
   * contact actions (add-to-list, enroll, verify, suppress), which each loop
   * a per-contact endpoint client-side because they call a different
   * sub-resource per contact, a delete is a single homogeneous operation
   * that batches naturally. Cascade to contact_tags/contact_lists/sends/
   * email_events/sequence_enrollments is handled entirely by the schema's
   * `onDelete: 'cascade'` FKs, same as the single-contact delete above. */
  async bulkRemove(ids: string[]) {
    const deleted = await this.drizzle.db.delete(contacts).where(inArray(contacts.id, ids)).returning({ id: contacts.id });
    return { deleted: deleted.length };
  }

  async upsertByEmail(email: string, fields: { firstName?: string; lastName?: string; customFields?: Record<string, unknown> }) {
    const existing = await this.drizzle.db.query.contacts.findFirst({ where: eq(contacts.email, email) });

    if (existing) {
      const [updated] = await this.drizzle.db
        .update(contacts)
        .set({
          firstName: fields.firstName ?? existing.firstName,
          lastName: fields.lastName ?? existing.lastName,
          customFields: fields.customFields ? { ...(existing.customFields as object), ...fields.customFields } : existing.customFields,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.drizzle.db
      .insert(contacts)
      .values({
        email,
        firstName: fields.firstName,
        lastName: fields.lastName,
        customFields: fields.customFields ?? {},
      })
      .returning();
    return created;
  }
}
