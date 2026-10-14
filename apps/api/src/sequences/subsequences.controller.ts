import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SubsequenceService } from '../inbox/inbox-events.listener';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('sequences/:id/subsequences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubsequencesController {
  constructor(private readonly subs: SubsequenceService) {}

  @Get()
  list(@Param('id') id: string) {
    return this.subs.list(id);
  }

  @Post()
  @Roles('owner', 'editor')
  create(
    @Param('id') id: string,
    @Body()
    dto: {
      name: string;
      trigger: 'reply' | 'positive' | 'open' | 'click' | 'ooo' | 'custom_text';
      matchText?: string;
      childSequenceId: string;
      delayMs?: string;
      stopParent?: boolean;
    },
  ) {
    return this.subs.create(id, dto);
  }

  @Delete(':subId')
  @Roles('owner', 'editor')
  remove(@Param('subId') subId: string) {
    return this.subs.remove(subId);
  }
}
