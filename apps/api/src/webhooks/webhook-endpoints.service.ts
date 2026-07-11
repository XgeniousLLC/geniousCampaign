import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { webhookEndpoints } from '../db/schema';
import { CreateWebhookEndpointDto } from './dto/create-webhook-endpoint.dto';

@Injectable()
export class WebhookEndpointsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(dto: CreateWebhookEndpointDto) {
    const existing = await this.drizzle.db.query.webhookEndpoints.findFirst({
      where: eq(webhookEndpoints.slug, dto.slug),
    });
    if (existing) {
      throw new ConflictException(`A webhook endpoint with slug "${dto.slug}" already exists`);
    }

    const secret = randomBytes(32).toString('hex');
    const [created] = await this.drizzle.db
      .insert(webhookEndpoints)
      .values({ name: dto.name, slug: dto.slug, secret, fieldMapping: dto.fieldMapping ?? {} })
      .returning();
    return created;
  }

  findAll() {
    return this.drizzle.db.query.webhookEndpoints.findMany({ orderBy: (w, { desc }) => desc(w.createdAt) });
  }

  async findOne(id: string) {
    const endpoint = await this.drizzle.db.query.webhookEndpoints.findFirst({ where: eq(webhookEndpoints.id, id) });
    if (!endpoint) {
      throw new NotFoundException(`Webhook endpoint ${id} not found`);
    }
    return endpoint;
  }

  findBySlug(slug: string) {
    return this.drizzle.db.query.webhookEndpoints.findFirst({ where: eq(webhookEndpoints.slug, slug) });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.drizzle.db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, id));
    return { id };
  }
}
