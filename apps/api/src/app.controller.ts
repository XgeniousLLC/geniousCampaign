import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';

@Public()
@Controller()
export class AppController {
  @Get()
  root() {
    return { name: 'geniusCampaign API', status: 'ok' };
  }
}
