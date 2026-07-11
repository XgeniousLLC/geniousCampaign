import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { WebhookEndpointsService } from './webhook-endpoints.service';
import { CreateWebhookEndpointDto } from './dto/create-webhook-endpoint.dto';

@Controller('webhook-endpoints')
export class WebhookEndpointsController {
  constructor(private readonly service: WebhookEndpointsService) {}

  @Post()
  create(@Body() dto: CreateWebhookEndpointDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
