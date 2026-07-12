import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { outboundWebhookSubscriptions } from '../db/schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class OutboundWebhookSubscriptionsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(dto: CreateSubscriptionDto) {
    const [created] = await this.drizzle.db
      .insert(outboundWebhookSubscriptions)
      .values({ name: dto.name, url: dto.url, eventTypes: dto.eventTypes, secret: randomBytes(32).toString('hex') })
      .returning();
    return created;
  }

  findAll() {
    return this.drizzle.db.query.outboundWebhookSubscriptions.findMany({
      orderBy: (s, { desc }) => desc(s.createdAt),
    });
  }

  async findActiveForEvent(eventType: string) {
    const all = await this.drizzle.db.query.outboundWebhookSubscriptions.findMany({
      where: eq(outboundWebhookSubscriptions.isActive, true),
    });
    return all.filter((sub) => sub.eventTypes.includes(eventType));
  }

  async remove(id: string) {
    const existing = await this.drizzle.db.query.outboundWebhookSubscriptions.findFirst({
      where: eq(outboundWebhookSubscriptions.id, id),
    });
    if (!existing) throw new NotFoundException(`Subscription ${id} not found`);
    await this.drizzle.db.delete(outboundWebhookSubscriptions).where(eq(outboundWebhookSubscriptions.id, id));
    return { id };
  }
}
