import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, inArray, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { contacts, contactTags, tags, contactLists, lists, verificationResults, sends, emailEvents } from '../db/schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

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
    if (all.length === 0) return [];

    const ids = all.map((c) => c.id);
    const emails = all.map((c) => c.email);

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

    return all.map((c) => ({
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
