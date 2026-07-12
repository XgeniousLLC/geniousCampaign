import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { sequences, sequenceSteps } from '../db/schema';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';

@Injectable()
export class SequencesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(dto: CreateSequenceDto) {
    const [created] = await this.drizzle.db
      .insert(sequences)
      .values({ name: dto.name, description: dto.description, webhookSecret: randomBytes(32).toString('hex') })
      .returning();
    return created;
  }

  findAll() {
    return this.drizzle.db.query.sequences.findMany({ orderBy: (s, { desc }) => desc(s.createdAt) });
  }

  async findOne(id: string) {
    const sequence = await this.drizzle.db.query.sequences.findFirst({ where: eq(sequences.id, id) });
    if (!sequence) {
      throw new NotFoundException(`Sequence ${id} not found`);
    }
    return sequence;
  }

  async update(id: string, dto: UpdateSequenceDto) {
    await this.findOne(id);
    const [updated] = await this.drizzle.db
      .update(sequences)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(sequences.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.drizzle.db.delete(sequences).where(eq(sequences.id, id));
    return { id };
  }

  listSteps(sequenceId: string) {
    return this.drizzle.db.query.sequenceSteps.findMany({
      where: eq(sequenceSteps.sequenceId, sequenceId),
      orderBy: asc(sequenceSteps.order),
    });
  }

  async addStep(sequenceId: string, dto: CreateStepDto) {
    await this.findOne(sequenceId);

    const currentSteps = await this.drizzle.db
      .select({ order: sequenceSteps.order })
      .from(sequenceSteps)
      .where(eq(sequenceSteps.sequenceId, sequenceId));
    const nextOrder = currentSteps.length > 0 ? Math.max(...currentSteps.map((s) => s.order)) + 1 : 0;

    const [created] = await this.drizzle.db
      .insert(sequenceSteps)
      .values({
        sequenceId,
        order: nextOrder,
        type: dto.type,
        templateId: dto.templateId,
        delayValue: dto.delayValue,
        delayUnit: dto.delayUnit,
      })
      .returning();
    return created;
  }

  async updateStep(sequenceId: string, stepId: string, dto: UpdateStepDto) {
    await this.findOne(sequenceId);
    const step = await this.drizzle.db.query.sequenceSteps.findFirst({ where: eq(sequenceSteps.id, stepId) });
    if (!step || step.sequenceId !== sequenceId) {
      throw new NotFoundException(`Step ${stepId} not found in sequence ${sequenceId}`);
    }

    const [updated] = await this.drizzle.db
      .update(sequenceSteps)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(sequenceSteps.id, stepId))
      .returning();
    return updated;
  }

  async removeStep(sequenceId: string, stepId: string) {
    await this.findOne(sequenceId);
    const step = await this.drizzle.db.query.sequenceSteps.findFirst({ where: eq(sequenceSteps.id, stepId) });
    if (!step || step.sequenceId !== sequenceId) {
      throw new NotFoundException(`Step ${stepId} not found in sequence ${sequenceId}`);
    }
    await this.drizzle.db.delete(sequenceSteps).where(eq(sequenceSteps.id, stepId));
    return { id: stepId };
  }

  async reorderSteps(sequenceId: string, dto: ReorderStepsDto) {
    await this.findOne(sequenceId);
    const existing = await this.listSteps(sequenceId);
    const existingIds = new Set(existing.map((s) => s.id));

    if (dto.stepIds.length !== existing.length || !dto.stepIds.every((id) => existingIds.has(id))) {
      throw new BadRequestException('stepIds must be exactly the set of this sequence\'s current step IDs');
    }

    await this.drizzle.db.transaction(async (tx) => {
      for (let i = 0; i < dto.stepIds.length; i++) {
        await tx
          .update(sequenceSteps)
          .set({ order: i, updatedAt: new Date() })
          .where(eq(sequenceSteps.id, dto.stepIds[i]));
      }
    });

    return this.listSteps(sequenceId);
  }
}
