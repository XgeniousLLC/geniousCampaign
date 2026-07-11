import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { webhookDeliveries } from '../db/schema';

export interface LogDeliveryInput {
  webhookEndpointId: string | null;
  slug: string;
  signatureValid: boolean;
  payload: unknown;
  headers: Record<string, unknown>;
  error?: string;
}

@Injectable()
export class WebhookDeliveriesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async log(input: LogDeliveryInput) {
    const [created] = await this.drizzle.db
      .insert(webhookDeliveries)
      .values({
        webhookEndpointId: input.webhookEndpointId,
        slug: input.slug,
        signatureValid: input.signatureValid,
        payload: input.payload as Record<string, unknown> | undefined,
        headers: input.headers,
        error: input.error,
      })
      .returning();
    return created;
  }

  listBySlug(slug: string) {
    return this.drizzle.db.query.webhookDeliveries.findMany({
      where: eq(webhookDeliveries.slug, slug),
      orderBy: (d, { desc }) => desc(d.receivedAt),
    });
  }
}
