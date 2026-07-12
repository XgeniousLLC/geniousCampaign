import { BadRequestException, Controller, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { sequences } from '../db/schema';
import { EnrollmentService } from './enrollment.service';
import { WebhookDeliveriesService } from '../webhooks/webhook-deliveries.service';
import { verifyHmacSignature } from '../webhooks/hmac.util';

type Action = 'enroll' | 'pause' | 'resume' | 'stop';

/**
 * Public, HMAC-signed equivalent of GC-042's admin controller — both call
 * EnrollmentService directly and identically (CLAUDE.md invariant 2).
 */
@Controller('webhooks/in/sequences')
export class SequenceWebhookController {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly enrollments: EnrollmentService,
    private readonly deliveries: WebhookDeliveriesService,
  ) {}

  @Post(':id/enroll')
  enroll(@Param('id') id: string, @Req() req: RawBodyRequest<Request>) {
    return this.handle(id, 'enroll', req);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string, @Req() req: RawBodyRequest<Request>) {
    return this.handle(id, 'pause', req);
  }

  @Post(':id/resume')
  resume(@Param('id') id: string, @Req() req: RawBodyRequest<Request>) {
    return this.handle(id, 'resume', req);
  }

  @Post(':id/stop')
  stop(@Param('id') id: string, @Req() req: RawBodyRequest<Request>) {
    return this.handle(id, 'stop', req);
  }

  private async handle(sequenceId: string, action: Action, req: RawBodyRequest<Request>) {
    const sequence = await this.drizzle.db.query.sequences.findFirst({ where: eq(sequences.id, sequenceId) });
    const rawBody = req.rawBody ?? Buffer.alloc(0);
    const signature = req.headers['x-signature'] as string | undefined;
    const signatureValid = !!sequence && verifyHmacSignature(sequence.webhookSecret, rawBody, signature);

    let payload: unknown;
    try {
      payload = rawBody.length > 0 ? JSON.parse(rawBody.toString('utf8')) : {};
    } catch {
      payload = undefined;
    }

    // Every inbound call is logged before processing, valid or not (invariant 4).
    await this.deliveries.log({
      webhookEndpointId: null,
      slug: `sequences/${sequenceId}/${action}`,
      signatureValid,
      payload,
      headers: { 'x-signature': signature ?? null },
    });

    if (!sequence || !signatureValid) {
      throw new UnauthorizedException('Missing or invalid signature');
    }

    const contactId = (payload as { contactId?: string })?.contactId;
    if (!contactId) {
      throw new BadRequestException('contactId is required');
    }

    return this.runAction(sequenceId, contactId, action);
  }

  private async runAction(sequenceId: string, contactId: string, action: Action) {
    if (action === 'enroll') {
      return this.enrollments.enroll(sequenceId, contactId);
    }
    const enrollment = await this.enrollments.findActiveForContactInSequence(sequenceId, contactId);
    if (action === 'pause') return this.enrollments.pause(enrollment.id);
    if (action === 'resume') return this.enrollments.resume(enrollment.id);
    return this.enrollments.stop(enrollment.id);
  }
}
