import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { tags, contactTags, contacts } from '../db/schema';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly events: EventEmitter2,
  ) {}

  async create(dto: CreateTagDto) {
    const existing = await this.drizzle.db.query.tags.findFirst({ where: eq(tags.name, dto.name) });
    if (existing) {
      throw new ConflictException(`A tag named "${dto.name}" already exists`);
    }
    const [created] = await this.drizzle.db.insert(tags).values({ name: dto.name }).returning();
    return created;
  }

  findAll() {
    return this.drizzle.db.query.tags.findMany({ orderBy: (t, { desc }) => desc(t.createdAt) });
  }

  async findOne(id: string) {
    const tag = await this.drizzle.db.query.tags.findFirst({ where: eq(tags.id, id) });
    if (!tag) {
      throw new NotFoundException(`Tag ${id} not found`);
    }
    return tag;
  }

  async update(id: string, dto: UpdateTagDto) {
    await this.findOne(id);
    const [updated] = await this.drizzle.db.update(tags).set(dto).where(eq(tags.id, id)).returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.drizzle.db.delete(tags).where(eq(tags.id, id));
    return { id };
  }

  async addContact(tagId: string, contactId: string) {
    const tag = await this.findOne(tagId);
    const contact = await this.drizzle.db.query.contacts.findFirst({ where: eq(contacts.id, contactId) });
    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    const existing = await this.drizzle.db.query.contactTags.findFirst({
      where: and(eq(contactTags.tagId, tagId), eq(contactTags.contactId, contactId)),
    });
    if (existing) {
      throw new ConflictException(`Contact ${contactId} already has tag ${tagId}`);
    }

    await this.drizzle.db.insert(contactTags).values({ tagId, contactId });
    this.events.emit('contact.tag_added', { contactId, tagId, tagName: tag.name });
    return { tagId, contactId };
  }

  async removeContact(tagId: string, contactId: string) {
    await this.findOne(tagId);
    await this.drizzle.db
      .delete(contactTags)
      .where(and(eq(contactTags.tagId, tagId), eq(contactTags.contactId, contactId)));
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
