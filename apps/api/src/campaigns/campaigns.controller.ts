import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { DrizzleService } from '../db/drizzle.service';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly auditLog: AuditLogService,
    private readonly drizzle: DrizzleService,
  ) {}

  @Post()
  @Roles('owner', 'editor')
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const campaign = await this.campaigns.create(dto, tx);
      await this.auditLog.record(user, 'campaign.create', 'campaign', campaign.id, { name: dto.name }, tx);
      return campaign;
    });
  }

  @Get()
  findAll() {
    return this.campaigns.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaigns.findOne(id);
  }

  @Get(':id/sends')
  getSends(@Param('id') id: string) {
    return this.campaigns.getSends(id);
  }

  @Post(':id/send')
  @Roles('owner', 'editor')
  async send(@Param('id') id: string, @Body() dto: SendCampaignDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.campaigns.send(id, dto.confirmed, dto.scheduledAt);
    await this.auditLog.record(user, 'campaign.send', 'campaign', id, { confirmed: dto.confirmed ?? false, scheduledAt: dto.scheduledAt });
    return result;
  }

  @Post(':id/cancel-schedule')
  @Roles('owner', 'editor')
  async cancelSchedule(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.campaigns.cancelSchedule(id);
    await this.auditLog.record(user, 'campaign.cancel_schedule', 'campaign', id, {});
    return result;
  }
}
