import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { triggers } from '../db/schema';
import { CreateTriggerDto } from './dto/create-trigger.dto';
import { UpdateTriggerDto } from './dto/update-trigger.dto';

@Injectable()
export class TriggersService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(dto: CreateTriggerDto) {
    const [created] = await this.drizzle.db
      .insert(triggers)
      .values({
        name: dto.name,
        eventType: dto.eventType,
        conditions: dto.conditions,
        sequenceId: dto.sequenceId,
        isActive: dto.isActive ?? true,
      })
      .returning();
    return created;
  }

  findAll() {
    return this.drizzle.db.query.triggers.findMany({ orderBy: (t, { desc }) => desc(t.createdAt) });
  }

  async findOne(id: string) {
    const trigger = await this.drizzle.db.query.triggers.findFirst({ where: eq(triggers.id, id) });
    if (!trigger) {
      throw new NotFoundException(`Trigger ${id} not found`);
    }
    return trigger;
  }

  findActiveForEvent(eventType: string) {
    return this.drizzle.db.query.triggers.findMany({
      where: (t, { and }) => and(eq(t.eventType, eventType), eq(t.isActive, true)),
    });
  }

  async update(id: string, dto: UpdateTriggerDto) {
    await this.findOne(id);
    const [updated] = await this.drizzle.db
      .update(triggers)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(triggers.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.drizzle.db.delete(triggers).where(eq(triggers.id, id));
    return { id };
  }
}
