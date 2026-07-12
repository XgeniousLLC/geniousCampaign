import { Module } from '@nestjs/common';
import { OutboundWebhookEventListener } from './outbound-webhook-event-listener.service';
import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';

@Module({
  imports: [OutboundWebhooksModule],
  providers: [OutboundWebhookEventListener],
})
export class EventsModule {}
