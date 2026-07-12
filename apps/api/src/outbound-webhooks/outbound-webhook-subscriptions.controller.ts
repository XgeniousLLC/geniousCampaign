import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OutboundWebhookSubscriptionsService } from './outbound-webhook-subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Controller('outbound-webhook-subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OutboundWebhookSubscriptionsController {
  constructor(private readonly subscriptions: OutboundWebhookSubscriptionsService) {}

  @Post()
  @Roles('owner', 'editor')
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptions.create(dto);
  }

  @Get()
  findAll() {
    return this.subscriptions.findAll();
  }

  @Delete(':id')
  @Roles('owner', 'editor')
  remove(@Param('id') id: string) {
    return this.subscriptions.remove(id);
  }
}
