import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { EmailLogService, type EmailLogFilter } from './email-log.service';

@Controller('email-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailLogController {
  constructor(private readonly emailLog: EmailLogService) {}

  @Get()
  list(
    @Query('status') status?: EmailLogFilter['status'],
    @Query('campaignId') campaignId?: string,
    @Query('sequenceId') sequenceId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.emailLog.list({
      status,
      campaignId,
      sequenceId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.emailLog.getDetail(id);
  }
}
