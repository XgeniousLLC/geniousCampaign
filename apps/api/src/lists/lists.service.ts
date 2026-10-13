import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { DbOrTx } from '../db/types';
import { lists, contactLists, contacts, contactTags, tags } from '../db/schema';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { buildContactsCsv, slugify } from '../contacts/csv-export.util';

@Injectable()
export class ListsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly events: EventEmitter2,
  ) {}

  async create(dto: CreateListDto, db: DbOrTx = this.drizzle.db) {
    const [created] = await db
      .insert(lists)
      .values({
        name: dto.name,
        type: dto.type ?? 'static',
        filterDefinition: dto.filterDefinition,
      })
      .returning();
    return created;
  }

  findAll() {
    return this.drizzle.db.query.lists.findMany({ orderBy: (l, { desc }) => desc(l.createdAt) });
  }

  async findOne(id: string, db: DbOrTx = this.drizzle.db) {
    const list = await db.query.lists.findFirst({ where: eq(lists.id, id) });
    if (!list) {
      throw new NotFoundException(`List ${id} not found`);
    }
    return list;
  }

  async update(id: string, dto: UpdateListDto, db: DbOrTx = this.drizzle.db) {
    await this.findOne(id, db);
    const [updated] = await db
      .update(lists)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(lists.id, id))
      .returning();
    return updated;
  }

  async remove(id: string, db: DbOrTx = this.drizzle.db) {
    await this.findOne(id, db);
    await db.delete(lists).where(eq(lists.id, id));
    return { id };
  }

  async addContact(listId: string, contactId: string, db: DbOrTx = this.drizzle.db) {
    const list = await this.findOne(listId, db);
    const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, contactId) });
    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    const existing = await db.query.contactLists.findFirst({
      where: and(eq(contactLists.listId, listId), eq(contactLists.contactId, contactId)),
    });
    if (existing) {
      throw new ConflictException(`Contact ${contactId} is already in list ${listId}`);
    }

    await db.insert(contactLists).values({ listId, contactId });
    this.events.emit('contact.list_joined', { contactId, listId, listName: list.name });
    return { listId, contactId };
  }

  /** Bulk-import-friendly variant of `addContact()` — skips the
   * existence/re-check SELECTs (the caller already knows both ids are
   * valid, e.g. right after creating the contact) and never throws on an
   * already-present pair, it just no-ops. Still emits the same event so
   * triggers (GC-035) fire the same as a one-by-one add. Callers looping
   * over many contacts for the same list should pass `listName` (fetched
   * once outside the loop) to avoid a repeated lookup per row. */
  async addContactSilent(listId: string, contactId: string, listName?: string, db: DbOrTx = this.drizzle.db) {
    const inserted = await db.insert(contactLists).values({ listId, contactId }).onConflictDoNothing().returning();
    if (inserted.length > 0) {
      const name = listName ?? (await db.query.lists.findFirst({ where: eq(lists.id, listId) }))?.name;
      this.events.emit('contact.list_joined', { contactId, listId, listName: name });
    }
  }

  async removeContact(listId: string, contactId: string, db: DbOrTx = this.drizzle.db) {
    await this.findOne(listId, db);
    await db.delete(contactLists).where(and(eq(contactLists.listId, listId), eq(contactLists.contactId, contactId)));
    return { listId, contactId };
  }

  async listContacts(listId: string) {
    await this.findOne(listId);
    return this.drizzle.db
      .select({ contact: contacts, addedAt: contactLists.addedAt })
      .from(contactLists)
      .innerJoin(contacts, eq(contactLists.contactId, contacts.id))
      .where(eq(contactLists.listId, listId));
  }

  /** Builds the list's full member content as CSV — the counterpart to the
   * contacts CSV import. Base columns are stable (email, first_name,
   * last_name, status, tags, added_at); every customFields key present on
   * any member becomes an extra column (sorted) so no data is dropped and
   * the file re-imports through the column-mapping step. */
  async exportCsv(listId: string): Promise<{ filename: string; csv: string }> {
    const list = await this.findOne(listId);
    const rows = await this.listContacts(listId);

    const ids = rows.map((r) => r.contact.id);
    const tagsByContact = new Map<string, { name: string }[]>();
    if (ids.length > 0) {
      const tagRows = await this.drizzle.db
        .select({ contactId: contactTags.contactId, name: tags.name })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .where(inArray(contactTags.contactId, ids));
      for (const row of tagRows) {
        const names = tagsByContact.get(row.contactId) ?? [];
        names.push({ name: row.name });
        tagsByContact.set(row.contactId, names);
      }
    }

    const csv = buildContactsCsv(
      rows.map(({ contact, addedAt }) => ({
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        status: contact.status,
        customFields: (contact.customFields ?? {}) as Record<string, unknown>,
        tags: tagsByContact.get(contact.id) ?? [],
        lists: [],
        dateValue: addedAt instanceof Date ? addedAt.toISOString() : String(addedAt ?? ''),
      })),
      { includeListsColumn: false, dateHeader: 'added_at' },
    );

    return { filename: `${slugify(list.name)}.csv`, csv };
  }
}
