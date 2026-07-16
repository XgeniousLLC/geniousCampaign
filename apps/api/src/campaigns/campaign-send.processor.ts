import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { resolveSpintax, resolvePersonalization } from '@genius-campaign/shared';
import { DrizzleService } from '../db/drizzle.service';
import { campaigns, templates, sends } from '../db/schema';
import { CampaignsService } from './campaigns.service';
import { SuppressionService } from '../suppression/suppression.service';
import { TrackingService } from '../tracking/tracking.service';
import { SendDispatcherService } from '../sending/send-dispatcher.service';
import { rewriteLinksForTracking } from '../tracking/rewrite-links.util';
import { signUnsubscribeToken } from '../sending/unsubscribe-token.util';

@Processor('campaign-send')
export class CampaignSendProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignSendProcessor.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly settings: SettingsService,
    private readonly campaignsService: CampaignsService,
    private readonly suppression: SuppressionService,
    private readonly tracking: TrackingService,
    private readonly sendDispatcher: SendDispatcherService,
    private readonly events: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<{ campaignId: string }>) {
    const campaign = await this.drizzle.db.query.campaigns.findFirst({ where: eq(campaigns.id, job.data.campaignId) });
    // Re-check status at fire time (invariant 3 pattern) — a duplicate job
    // for an already-sending/sent campaign is a no-op, not a second send.
    if (!campaign || campaign.status !== 'draft') {
      return { skipped: true };
    }

    const template = await this.drizzle.db.query.templates.findFirst({ where: eq(templates.id, campaign.templateId) });
    if (!template) {
      await this.drizzle.db.update(campaigns).set({ status: 'failed', updatedAt: new Date() }).where(eq(campaigns.id, campaign.id));
      return { error: `Template ${campaign.templateId} not found` };
    }

    await this.drizzle.db.update(campaigns).set({ status: 'sending', updatedAt: new Date() }).where(eq(campaigns.id, campaign.id));

    const recipients = await this.campaignsService.resolveRecipients(campaign);
    let sentCount = 0;
    let failedCount = 0;
    let suppressedCount = 0;

    for (const { contact } of recipients) {
      // Two independent gates: suppression_list (bounces/complaints/manual
      // unsubscribe/invalid-verification) and contact.status — a contact
      // can carry status 'suppressed'/'unsubscribed' without a matching
      // suppression_list row (e.g. set directly via CSV import or a
      // PATCH /contacts/:id) and must still never receive a send.
      const statusBlocked = contact.status === 'suppressed' || contact.status === 'unsubscribed';
      if (statusBlocked || (await this.suppression.isSuppressed(contact.email))) {
        suppressedCount++;
        await this.drizzle.db.insert(sends).values({
          contactId: contact.id,
          templateId: template.id,
          campaignId: campaign.id,
          provider: 'ses',
          resolvedSubject: template.subject,
          resolvedBodyHtml: template.bodyHtml,
          resolvedBodyText: template.bodyText,
          status: 'suppressed',
          error: statusBlocked ? `${contact.email} has status "${contact.status}"` : `${contact.email} is on the suppression list`,
          isDryRun: campaign.isDryRun,
        });
        continue;
      }

      // Personalization resolved before spintax — invariant 5.
      const resolvedSubject = resolveSpintax(resolvePersonalization(template.subject, contact));
      const resolvedBodyHtmlRaw = resolveSpintax(resolvePersonalization(template.bodyHtml, contact));
      const resolvedBodyText = resolveSpintax(resolvePersonalization(template.bodyText, contact));

      const sendId = randomUUID();
      const openPixelUrl = this.tracking.buildOpenPixelUrl(sendId);
      const htmlWithClickTracking = rewriteLinksForTracking(resolvedBodyHtmlRaw, (url) =>
        this.tracking.buildClickUrl(sendId, url),
      );
      const resolvedBodyHtml = `${htmlWithClickTracking}<img src="${openPixelUrl}" width="1" height="1" alt="" style="display:none" />`;

      const trackingSecret = this.settings.get('TRACKING_SIGNING_SECRET');
      const unsubscribeUrl = trackingSecret
        ? `${this.tracking.baseUrl}/unsubscribe/${signUnsubscribeToken(trackingSecret, contact.email)}`
        : '#';

      if (campaign.isDryRun) {
        // Dry-run stops here — never calls the real sender at all. Distinct
        // from sendToEmail below (GC-052's other half): dry-run means "never
        // send", sendToEmail means "really send, just redirected".
        await this.drizzle.db.insert(sends).values({
          id: sendId,
          contactId: contact.id,
          templateId: template.id,
          campaignId: campaign.id,
          provider: 'ses',
          resolvedSubject,
          resolvedBodyHtml,
          resolvedBodyText,
          status: 'sent',
          isDryRun: true,
          sentAt: new Date(),
        });
        sentCount++;
        continue;
      }

      await this.drizzle.db.insert(sends).values({
        id: sendId,
        contactId: contact.id,
        templateId: template.id,
        campaignId: campaign.id,
        provider: 'ses',
        resolvedSubject,
        resolvedBodyHtml,
        resolvedBodyText,
        status: 'failed',
      });

      try {
        // GC-052 send-to-self: a real send, quota still consumed, just
        // redirected to a fixed test address rather than the real
        // recipient — the subject marks who it was really meant for.
        const sendTarget = campaign.sendToEmail || contact.email;
        const sendSubject = campaign.sendToEmail ? `[Test → ${contact.email}] ${resolvedSubject}` : resolvedSubject;
        const result = await this.sendDispatcher.send({
          to: sendTarget,
          subject: sendSubject,
          html: resolvedBodyHtml,
          text: resolvedBodyText,
          unsubscribeUrl,
          messageTags: { campaignId: campaign.id },
        });
        await this.drizzle.db
          .update(sends)
          .set({ status: 'sent', provider: result.provider, providerMessageId: result.providerMessageId, sentAt: new Date() })
          .where(eq(sends.id, sendId));
        sentCount++;
      } catch (err) {
        await this.drizzle.db
          .update(sends)
          .set({ status: 'failed', error: err instanceof Error ? err.message : String(err) })
          .where(eq(sends.id, sendId));
        failedCount++;
      }
    }

    const attempted = sentCount + failedCount;
    const finalStatus = attempted > 0 && sentCount === 0 ? 'failed' : 'sent';
    await this.drizzle.db
      .update(campaigns)
      .set({ status: finalStatus, sentCount, failedCount, suppressedCount, updatedAt: new Date() })
      .where(eq(campaigns.id, campaign.id));

    this.logger.log(
      `Campaign "${campaign.name}" (${campaign.id}) finished: ${sentCount} sent, ${failedCount} failed, ${suppressedCount} suppressed`,
    );
    this.events.emit('campaign.completed', { campaignId: campaign.id, name: campaign.name, sentCount, failedCount, suppressedCount });
    return { sentCount, failedCount, suppressedCount };
  }
}
