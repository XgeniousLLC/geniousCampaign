import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SequencesService } from './sequences.service';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';

@Controller('sequences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SequencesController {
  constructor(
    private readonly sequencesService: SequencesService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Post()
  @Roles('owner', 'editor')
  async create(@Body() dto: CreateSequenceDto, @CurrentUser() user: AuthenticatedUser) {
    const created = await this.sequencesService.create(dto);
    await this.auditLog.record(user, 'sequence.create', 'sequence', created.id, { name: created.name });
    return created;
  }

  @Get()
  findAll() {
    return this.sequencesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sequencesService.findOne(id);
  }

  @Patch(':id')
  @Roles('owner', 'editor')
  async update(@Param('id') id: string, @Body() dto: UpdateSequenceDto, @CurrentUser() user: AuthenticatedUser) {
    const updated = await this.sequencesService.update(id, dto);
    await this.auditLog.record(user, 'sequence.update', 'sequence', id, { fields: Object.keys(dto) });
    return updated;
  }

  @Delete(':id')
  @Roles('owner', 'editor')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.sequencesService.remove(id);
    await this.auditLog.record(user, 'sequence.delete', 'sequence', id);
    return result;
  }

  @Get(':id/steps')
  listSteps(@Param('id') id: string) {
    return this.sequencesService.listSteps(id);
  }

  @Post(':id/steps')
  @Roles('owner', 'editor')
  async addStep(@Param('id') id: string, @Body() dto: CreateStepDto, @CurrentUser() user: AuthenticatedUser) {
    const step = await this.sequencesService.addStep(id, dto);
    await this.auditLog.record(user, 'sequence.step.add', 'sequence', id, { stepId: step.id, type: dto.type });
    return step;
  }

  @Patch(':id/steps/:stepId')
  @Roles('owner', 'editor')
  async updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateStepDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const step = await this.sequencesService.updateStep(id, stepId, dto);
    await this.auditLog.record(user, 'sequence.step.update', 'sequence', id, { stepId, fields: Object.keys(dto) });
    return step;
  }

  @Delete(':id/steps/:stepId')
  @Roles('owner', 'editor')
  async removeStep(@Param('id') id: string, @Param('stepId') stepId: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.sequencesService.removeStep(id, stepId);
    await this.auditLog.record(user, 'sequence.step.remove', 'sequence', id, { stepId });
    return result;
  }

  @Post(':id/steps/reorder')
  @Roles('owner', 'editor')
  async reorderSteps(@Param('id') id: string, @Body() dto: ReorderStepsDto, @CurrentUser() user: AuthenticatedUser) {
    const steps = await this.sequencesService.reorderSteps(id, dto);
    await this.auditLog.record(user, 'sequence.steps.reorder', 'sequence', id, { stepIds: dto.stepIds });
    return steps;
  }
}
