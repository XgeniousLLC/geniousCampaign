import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { contacts } from '../db/schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly drizzle: DrizzleService) {}

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
    return created;
  }

  findAll() {
    return this.drizzle.db.query.contacts.findMany({ orderBy: (c, { desc }) => desc(c.createdAt) });
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
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.drizzle.db.delete(contacts).where(eq(contacts.id, id));
    return { id };
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
