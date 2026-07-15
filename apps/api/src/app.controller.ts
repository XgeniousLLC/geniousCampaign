import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return { name: 'geniusCampaign API', status: 'ok' };
  }
}
