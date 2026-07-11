import { Controller, Get, Param } from '@nestjs/common';
import { WebhookDeliveriesService } from './webhook-deliveries.service';

@Controller('webhook-endpoints/:slug/deliveries')
export class WebhookDeliveriesController {
  constructor(private readonly deliveries: WebhookDeliveriesService) {}

  @Get()
  listBySlug(@Param('slug') slug: string) {
    return this.deliveries.listBySlug(slug);
  }
}
