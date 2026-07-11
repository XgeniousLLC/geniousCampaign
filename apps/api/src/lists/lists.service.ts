import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { lists, contactLists, contacts } from '../db/schema';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';

@Injectable()
export class ListsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(dto: CreateListDto) {
    const [created] = await this.drizzle.db
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

  async findOne(id: string) {
    const list = await this.drizzle.db.query.lists.findFirst({ where: eq(lists.id, id) });
    if (!list) {
      throw new NotFoundException(`List ${id} not found`);
    }
    return list;
  }

  async update(id: string, dto: UpdateListDto) {
    await this.findOne(id);
    const [updated] = await this.drizzle.db
      .update(lists)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(lists.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.drizzle.db.delete(lists).where(eq(lists.id, id));
    return { id };
  }

  async addContact(listId: string, contactId: string) {
    await this.findOne(listId);
    const contact = await this.drizzle.db.query.contacts.findFirst({ where: eq(contacts.id, contactId) });
    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    const existing = await this.drizzle.db.query.contactLists.findFirst({
      where: and(eq(contactLists.listId, listId), eq(contactLists.contactId, contactId)),
    });
    if (existing) {
      throw new ConflictException(`Contact ${contactId} is already in list ${listId}`);
    }

    await this.drizzle.db.insert(contactLists).values({ listId, contactId });
    return { listId, contactId };
  }

  async removeContact(listId: string, contactId: string) {
    await this.findOne(listId);
    await this.drizzle.db
      .delete(contactLists)
      .where(and(eq(contactLists.listId, listId), eq(contactLists.contactId, contactId)));
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
}
