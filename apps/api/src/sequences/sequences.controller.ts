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
import { DrizzleService } from '../db/drizzle.service';

@Controller('sequences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SequencesController {
  constructor(
    private readonly sequencesService: SequencesService,
    private readonly auditLog: AuditLogService,
    private readonly drizzle: DrizzleService,
  ) {}

  @Post()
  @Roles('owner', 'editor')
  create(@Body() dto: CreateSequenceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const created = await this.sequencesService.create(dto, tx);
      await this.auditLog.record(user, 'sequence.create', 'sequence', created.id, { name: created.name }, tx);
      return created;
    });
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
  update(@Param('id') id: string, @Body() dto: UpdateSequenceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const updated = await this.sequencesService.update(id, dto, tx);
      await this.auditLog.record(user, 'sequence.update', 'sequence', id, { fields: Object.keys(dto) }, tx);
      return updated;
    });
  }

  @Delete(':id')
  @Roles('owner', 'editor')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const result = await this.sequencesService.remove(id, tx);
      await this.auditLog.record(user, 'sequence.delete', 'sequence', id, undefined, tx);
      return result;
    });
  }

  @Get(':id/steps')
  listSteps(@Param('id') id: string) {
    return this.sequencesService.listSteps(id);
  }

  @Post(':id/steps')
  @Roles('owner', 'editor')
  addStep(@Param('id') id: string, @Body() dto: CreateStepDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const step = await this.sequencesService.addStep(id, dto, tx);
      await this.auditLog.record(user, 'sequence.step.add', 'sequence', id, { stepId: step.id, type: dto.type }, tx);
      return step;
    });
  }

  @Patch(':id/steps/:stepId')
  @Roles('owner', 'editor')
  updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateStepDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.drizzle.db.transaction(async (tx) => {
      const step = await this.sequencesService.updateStep(id, stepId, dto, tx);
      await this.auditLog.record(user, 'sequence.step.update', 'sequence', id, { stepId, fields: Object.keys(dto) }, tx);
      return step;
    });
  }

  @Delete(':id/steps/:stepId')
  @Roles('owner', 'editor')
  removeStep(@Param('id') id: string, @Param('stepId') stepId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const result = await this.sequencesService.removeStep(id, stepId, tx);
      await this.auditLog.record(user, 'sequence.step.remove', 'sequence', id, { stepId }, tx);
      return result;
    });
  }

  @Post(':id/steps/reorder')
  @Roles('owner', 'editor')
  reorderSteps(@Param('id') id: string, @Body() dto: ReorderStepsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const steps = await this.sequencesService.reorderSteps(id, dto, tx);
      await this.auditLog.record(user, 'sequence.steps.reorder', 'sequence', id, { stepIds: dto.stepIds }, tx);
      return steps;
    });
  }
}
