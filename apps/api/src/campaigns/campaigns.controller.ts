import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Post()
  @Roles('owner', 'editor')
  async create(@Body() dto: CreateCampaignDto, @CurrentUser() user: AuthenticatedUser) {
    const campaign = await this.campaigns.create(dto);
    await this.auditLog.record(user, 'campaign.create', 'campaign', campaign.id, { name: dto.name });
    return campaign;
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
    const result = await this.campaigns.send(id, dto.confirmed);
    await this.auditLog.record(user, 'campaign.send', 'campaign', id, { confirmed: dto.confirmed ?? false });
    return result;
  }
}
