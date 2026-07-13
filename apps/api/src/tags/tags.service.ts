import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { DbOrTx } from '../db/types';
import { tags, contactTags, contacts } from '../db/schema';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

// Palette shown to the user in the tag color picker (ListsAndTags.tsx) — kept
// in sync there. Used as a fallback so tags created without an explicit color
// still get visual variety instead of all defaulting to the same swatch.
const TAG_COLOR_PALETTE = ['#818CF8', '#34D399', '#F472B6', '#FBBF24', '#60A5FA', '#A78BFA', '#FB923C', '#38BDF8'];

@Injectable()
export class TagsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly events: EventEmitter2,
  ) {}

  async create(dto: CreateTagDto, db: DbOrTx = this.drizzle.db) {
    const existing = await db.query.tags.findFirst({ where: eq(tags.name, dto.name) });
    if (existing) {
      throw new ConflictException(`A tag named "${dto.name}" already exists`);
    }
    const color = dto.color ?? TAG_COLOR_PALETTE[Math.floor(Math.random() * TAG_COLOR_PALETTE.length)];
    const [created] = await db.insert(tags).values({ name: dto.name, color }).returning();
    return created;
  }

  findAll() {
    return this.drizzle.db.query.tags.findMany({ orderBy: (t, { desc }) => desc(t.createdAt) });
  }

  async findOne(id: string, db: DbOrTx = this.drizzle.db) {
    const tag = await db.query.tags.findFirst({ where: eq(tags.id, id) });
    if (!tag) {
      throw new NotFoundException(`Tag ${id} not found`);
    }
    return tag;
  }

  async update(id: string, dto: UpdateTagDto, db: DbOrTx = this.drizzle.db) {
    await this.findOne(id, db);
    const [updated] = await db.update(tags).set(dto).where(eq(tags.id, id)).returning();
    return updated;
  }

  async remove(id: string, db: DbOrTx = this.drizzle.db) {
    await this.findOne(id, db);
    await db.delete(tags).where(eq(tags.id, id));
    return { id };
  }

  async addContact(tagId: string, contactId: string, db: DbOrTx = this.drizzle.db) {
    const tag = await this.findOne(tagId, db);
    const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, contactId) });
    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    const existing = await db.query.contactTags.findFirst({
      where: and(eq(contactTags.tagId, tagId), eq(contactTags.contactId, contactId)),
    });
    if (existing) {
      throw new ConflictException(`Contact ${contactId} already has tag ${tagId}`);
    }

    await db.insert(contactTags).values({ tagId, contactId });
    this.events.emit('contact.tag_added', { contactId, tagId, tagName: tag.name });
    return { tagId, contactId };
  }

  /** Bulk-import-friendly variant of `addContact()` — see
   * `ListsService.addContactSilent()` for the reasoning (skips re-check
   * SELECTs, no-ops instead of throwing on an already-present pair, still
   * emits the join event so triggers fire). Pass `tagName` when looping
   * over many contacts for the same tag to avoid a repeated lookup. */
  async addContactSilent(tagId: string, contactId: string, tagName?: string, db: DbOrTx = this.drizzle.db) {
    const inserted = await db.insert(contactTags).values({ tagId, contactId }).onConflictDoNothing().returning();
    if (inserted.length > 0) {
      const name = tagName ?? (await db.query.tags.findFirst({ where: eq(tags.id, tagId) }))?.name;
      this.events.emit('contact.tag_added', { contactId, tagId, tagName: name });
    }
  }

  async removeContact(tagId: string, contactId: string, db: DbOrTx = this.drizzle.db) {
    await this.findOne(tagId, db);
    await db.delete(contactTags).where(and(eq(contactTags.tagId, tagId), eq(contactTags.contactId, contactId)));
    return { tagId, contactId };
  }

  async listContacts(tagId: string) {
    await this.findOne(tagId);
    return this.drizzle.db
      .select({ contact: contacts, addedAt: contactTags.addedAt })
      .from(contactTags)
      .innerJoin(contacts, eq(contactTags.contactId, contacts.id))
      .where(eq(contactTags.tagId, tagId));
  }
}
