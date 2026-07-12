import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { resolveSpintax } from '@genius-campaign/shared';
import { DrizzleService } from '../db/drizzle.service';
import { campaigns, templates, sends } from '../db/schema';
import { ListsService } from '../lists/lists.service';
import { SuppressionService } from '../suppression/suppression.service';
import { TrackingService } from '../tracking/tracking.service';
import { SesSenderProvider } from '../sending/ses-sender.provider';
import { resolvePersonalization } from '../sequence-runner/personalize.util';
import { rewriteLinksForTracking } from '../tracking/rewrite-links.util';
import { signUnsubscribeToken } from '../sending/unsubscribe-token.util';

@Processor('campaign-send')
export class CampaignSendProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignSendProcessor.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
    private readonly lists: ListsService,
    private readonly suppression: SuppressionService,
    private readonly tracking: TrackingService,
    private readonly sesSender: SesSenderProvider,
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

    const recipients = await this.lists.listContacts(campaign.listId);
    let sentCount = 0;
    let failedCount = 0;
    let suppressedCount = 0;

    for (const { contact } of recipients) {
      if (await this.suppression.isSuppressed(contact.email)) {
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
          error: `${contact.email} is on the suppression list`,
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

      const trackingSecret = this.config.get<string>('TRACKING_SIGNING_SECRET');
      const unsubscribeUrl = trackingSecret
        ? `${this.tracking.baseUrl}/unsubscribe/${signUnsubscribeToken(trackingSecret, contact.email)}`
        : '#';

      if (campaign.isDryRun) {
        // Dry-run stops here — never calls the real sender. Full
        // send-to-self routing is GC-052's scope; this ticket only
        // guarantees a dry-run campaign never reaches SES.
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
        const fromEmail = this.config.get<string>('SES_FROM_EMAIL') || 'noreply@example.com';
        const result = await this.sesSender.send({
          to: contact.email,
          from: fromEmail,
          subject: resolvedSubject,
          html: resolvedBodyHtml,
          text: resolvedBodyText,
          unsubscribeUrl,
          messageTags: { campaignId: campaign.id },
        });
        await this.drizzle.db
          .update(sends)
          .set({ status: 'sent', providerMessageId: result.providerMessageId, sentAt: new Date() })
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
    return { sentCount, failedCount, suppressedCount };
  }
}
