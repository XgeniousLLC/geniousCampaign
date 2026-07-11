import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { WebhookEndpointsController } from './webhook-endpoints.controller';
import { WebhookEndpointsService } from './webhook-endpoints.service';
import { WebhookDeliveriesController } from './webhook-deliveries.controller';
import { WebhookDeliveriesService } from './webhook-deliveries.service';
import { InboundWebhookController } from './inbound-webhook.controller';

@Module({
  imports: [ContactsModule],
  controllers: [WebhookEndpointsController, WebhookDeliveriesController, InboundWebhookController],
  providers: [WebhookEndpointsService, WebhookDeliveriesService],
})
export class WebhooksModule {}
