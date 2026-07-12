import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { and, asc, eq, lte } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { sequenceEnrollments, sequenceSteps, contacts, templates, sends } from '../db/schema';
import { resolveNextExecutableStep, type RunnerStep } from './step-resolution.util';
import { resolvePersonalization } from './personalize.util';
import { resolveSpintax } from '@genius-campaign/shared';
import { SendDispatcherService } from '../sending/send-dispatcher.service';
import { SuppressionService } from '../suppression/suppression.service';
import { TrackingService } from '../tracking/tracking.service';
import { rewriteLinksForTracking } from '../tracking/rewrite-links.util';
import { signUnsubscribeToken } from '../sending/unsubscribe-token.util';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SequenceRunnerService {
  private readonly logger = new Logger(SequenceRunnerService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
    private readonly sendDispatcher: SendDispatcherService,
    private readonly suppression: SuppressionService,
    private readonly tracking: TrackingService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * One tick: find every active enrollment whose nextRunAt is due, and
   * process each. Each enrollment re-checks its own status immediately
   * before executing (CLAUDE.md invariant 3) — this is what makes pause
   * take effect within one tick without needing to cancel a queued job.
   */
  async tick(): Promise<{ processed: number }> {
    const now = new Date();
    const due = await this.drizzle.db
      .select()
      .from(sequenceEnrollments)
      .where(and(eq(sequenceEnrollments.status, 'active'), lte(sequenceEnrollments.nextRunAt, now)));

    let processed = 0;
    for (const enrollment of due) {
      await this.processOne(enrollment.id, now);
      processed++;
    }
    return { processed };
  }

  private async processOne(enrollmentId: string, now: Date) {
    // Re-check status immediately before executing — invariant 3.
    const fresh = await this.drizzle.db.query.sequenceEnrollments.findFirst({
      where: eq(sequenceEnrollments.id, enrollmentId),
    });
    if (!fresh || fresh.status !== 'active' || !fresh.currentStepId) return;

    const step = await this.drizzle.db.query.sequenceSteps.findFirst({
      where: eq(sequenceSteps.id, fresh.currentStepId),
    });
    if (!step) return;

    try {
      if (step.type === 'exit') {
        await this.drizzle.db
          .update(sequenceEnrollments)
          .set({ status: 'completed', currentStepId: null, nextRunAt: null, updatedAt: now })
          .where(eq(sequenceEnrollments.id, enrollmentId));
        this.events.emit('sequence.completed', {
          enrollmentId,
          sequenceId: fresh.sequenceId,
          contactId: fresh.contactId,
        });
        return;
      }

      if (step.type === 'send_email') {
        await this.executeSendEmail(fresh, step);
      }
      // A sequence step of type 'condition' (branch mid-sequence) always
      // passes through for now — no ticket has specified its real branching
      // logic yet. Not to be confused with GC-035's trigger engine, which is
      // a separate concept: auto-enrolling a contact into a sequence from an
      // external event, not a conditional step inside an already-running one.

      await this.advance(fresh.sequenceId, fresh.contactId, enrollmentId, step.order, now);
    } catch (err) {
      this.logger.error(
        `Sequence runner failed processing enrollment ${enrollmentId} at step ${step.id}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private async executeSendEmail(
    enrollment: typeof sequenceEnrollments.$inferSelect,
    step: typeof sequenceSteps.$inferSelect,
  ) {
    const contact = await this.drizzle.db.query.contacts.findFirst({ where: eq(contacts.id, enrollment.contactId) });
    if (!contact) return;

    if (!step.templateId) {
      await this.recordFailedSend(enrollment, step, contact.id, 'Step has no template configured');
      return;
    }
    const template = await this.drizzle.db.query.templates.findFirst({ where: eq(templates.id, step.templateId) });
    if (!template) {
      await this.recordFailedSend(enrollment, step, contact.id, `Template ${step.templateId} not found`);
      return;
    }

    if (await this.suppression.isSuppressed(contact.email)) {
      await this.drizzle.db.insert(sends).values({
        contactId: contact.id,
        templateId: template.id,
        sequenceEnrollmentId: enrollment.id,
        sequenceId: enrollment.sequenceId,
        sequenceStepId: step.id,
        provider: 'ses',
        resolvedSubject: template.subject,
        resolvedBodyHtml: template.bodyHtml,
        resolvedBodyText: template.bodyText,
        status: 'suppressed',
        error: `${contact.email} is on the suppression list`,
      });
      return;
    }

    // Personalization tokens ({{contact.x}}) are resolved before spintax —
    // spintax's own {a|b} brace parser would otherwise mis-parse the doubled
    // braces of an unresolved token as a nested spintax group and eat them.
    // Spintax itself is resolved once per send, here, never at save time (invariant 5).
    const resolvedSubject = resolveSpintax(resolvePersonalization(template.subject, contact));
    const resolvedBodyHtmlRaw = resolveSpintax(resolvePersonalization(template.bodyHtml, contact));
    const resolvedBodyText = resolveSpintax(resolvePersonalization(template.bodyText, contact));

    const sendId = randomUUID();
    const openPixelUrl = this.tracking.buildOpenPixelUrl(sendId);
    const htmlWithClickTracking = rewriteLinksForTracking(resolvedBodyHtmlRaw, (url) =>
      this.tracking.buildClickUrl(sendId, url),
    );
    const resolvedBodyHtml = `${htmlWithClickTracking}<img src="${openPixelUrl}" width="1" height="1" alt="" style="display:none" />`;

    const trackingSecret = this.config.get<string>('TRACKING_SIGNING_SECRET');
    const unsubscribeUrl = trackingSecret
      ? `${this.tracking.baseUrl}/unsubscribe/${signUnsubscribeToken(trackingSecret, contact.email)}`
      : '#';

    await this.drizzle.db.insert(sends).values({
      id: sendId,
      contactId: contact.id,
      templateId: template.id,
      sequenceEnrollmentId: enrollment.id,
      sequenceId: enrollment.sequenceId,
      sequenceStepId: step.id,
      provider: 'ses',
      resolvedSubject,
      resolvedBodyHtml,
      resolvedBodyText,
      status: 'failed',
    });

    try {
      const result = await this.sendDispatcher.send({
        to: contact.email,
        subject: resolvedSubject,
        html: resolvedBodyHtml,
        text: resolvedBodyText,
        unsubscribeUrl,
        messageTags: { sequenceId: enrollment.sequenceId, sequenceStepId: step.id },
      });
      await this.drizzle.db
        .update(sends)
        .set({ status: 'sent', provider: result.provider, providerMessageId: result.providerMessageId, sentAt: new Date() })
        .where(eq(sends.id, sendId));
    } catch (err) {
      await this.drizzle.db
        .update(sends)
        .set({ status: 'failed', error: err instanceof Error ? err.message : String(err) })
        .where(eq(sends.id, sendId));
    }
  }

  private async recordFailedSend(
    enrollment: typeof sequenceEnrollments.$inferSelect,
    step: typeof sequenceSteps.$inferSelect,
    contactId: string,
    error: string,
  ) {
    await this.drizzle.db.insert(sends).values({
      contactId,
      sequenceEnrollmentId: enrollment.id,
      sequenceId: enrollment.sequenceId,
      sequenceStepId: step.id,
      provider: 'ses',
      resolvedSubject: '',
      resolvedBodyHtml: '',
      resolvedBodyText: '',
      status: 'failed',
      error,
    });
  }

  private async advance(sequenceId: string, contactId: string, enrollmentId: string, fromOrder: number, now: Date) {
    const allSteps: RunnerStep[] = await this.drizzle.db
      .select()
      .from(sequenceSteps)
      .where(eq(sequenceSteps.sequenceId, sequenceId))
      .orderBy(asc(sequenceSteps.order));

    const resolution = resolveNextExecutableStep(allSteps, fromOrder, now);

    if (resolution.done) {
      await this.drizzle.db
        .update(sequenceEnrollments)
        .set({ status: 'completed', currentStepId: null, nextRunAt: null, updatedAt: now })
        .where(eq(sequenceEnrollments.id, enrollmentId));
      this.events.emit('sequence.completed', { enrollmentId, sequenceId, contactId });
      return;
    }

    await this.drizzle.db
      .update(sequenceEnrollments)
      .set({ currentStepId: resolution.stepId, nextRunAt: resolution.runAt, updatedAt: now })
      .where(eq(sequenceEnrollments.id, enrollmentId));
  }
}
