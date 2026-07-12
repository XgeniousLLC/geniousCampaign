import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OutboundWebhookSubscriptionsService } from './outbound-webhook-subscriptions.service';
import { OutboundWebhookSubscriptionsController } from './outbound-webhook-subscriptions.controller';
import { OutboundWebhookDispatchService } from './outbound-webhook-dispatch.service';
import { OutboundWebhookProcessor } from './outbound-webhook.processor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'outbound-webhooks' }), AuthModule],
  controllers: [OutboundWebhookSubscriptionsController],
  providers: [OutboundWebhookSubscriptionsService, OutboundWebhookDispatchService, OutboundWebhookProcessor],
  exports: [OutboundWebhookDispatchService],
})
export class OutboundWebhooksModule {}
