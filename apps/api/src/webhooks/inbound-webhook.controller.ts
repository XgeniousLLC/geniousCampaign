import { Controller, Headers, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { WebhookEndpointsService } from './webhook-endpoints.service';
import { WebhookDeliveriesService } from './webhook-deliveries.service';
import { ContactsService } from '../contacts/contacts.service';
import { verifyHmacSignature } from './hmac.util';
import { mapPayloadToContact } from './map-payload.util';

@Controller('webhooks/in')
export class InboundWebhookController {
  constructor(
    private readonly endpoints: WebhookEndpointsService,
    private readonly deliveries: WebhookDeliveriesService,
    private readonly contacts: ContactsService,
  ) {}

  @Post(':slug')
  async receive(
    @Param('slug') slug: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string | undefined,
  ) {
    const rawBody = req.rawBody ?? Buffer.alloc(0);
    let payload: unknown;
    let parseError: string | undefined;
    try {
      payload = rawBody.length > 0 ? JSON.parse(rawBody.toString('utf8')) : {};
    } catch {
      payload = undefined;
      parseError = 'Invalid JSON payload';
    }

    const endpoint = await this.endpoints.findBySlug(slug);
    const signatureValid = !!endpoint && verifyHmacSignature(endpoint.secret, rawBody, signature);

    // Every inbound call is logged before any processing, valid or not.
    await this.deliveries.log({
      webhookEndpointId: endpoint?.id ?? null,
      slug,
      signatureValid,
      payload,
      headers: { 'x-signature': signature ?? null, 'content-type': req.headers['content-type'] ?? null },
      error: parseError,
    });

    if (!endpoint || !signatureValid) {
      throw new UnauthorizedException('Missing or invalid signature');
    }

    const mapped = mapPayloadToContact(payload, endpoint.fieldMapping as Record<string, string>);
    if (mapped.email) {
      await this.contacts.upsertByEmail(mapped.email, {
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        customFields: mapped.customFields,
      });
    }

    return { received: true };
  }
}
