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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.emailLog.list({
      status,
      campaignId,
      sequenceId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.emailLog.getDetail(id);
  }
}
