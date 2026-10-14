import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import type { ConditionTree } from '@genius-campaign/shared';
import { SubsequenceService } from '../inbox/inbox-events.listener';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

class CreateSubsequenceDto {
  @IsString() name!: string;
  @IsObject() conditions!: Record<string, unknown>;
  @IsOptional() @IsString() delayMs?: string;
  @IsOptional() @IsBoolean() stopParent?: boolean;
  @IsOptional() @IsString() scheduleId?: string | null;
}

class UpdateSubsequenceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsObject() conditions?: Record<string, unknown>;
  @IsOptional() @IsString() delayMs?: string;
  @IsOptional() @IsBoolean() stopParent?: boolean;
  @IsOptional() @IsString() scheduleId?: string | null;
}

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
  create(@Param('id') id: string, @Body() dto: CreateSubsequenceDto) {
    return this.subs.create(id, {
      ...dto,
      conditions: dto.conditions as unknown as ConditionTree,
    });
  }

  @Patch(':subId')
  @Roles('owner', 'editor')
  update(@Param('subId') subId: string, @Body() dto: UpdateSubsequenceDto) {
    return this.subs.update(subId, {
      ...dto,
      conditions: dto.conditions as unknown as ConditionTree | undefined,
    });
  }

  @Delete(':subId')
  @Roles('owner', 'editor')
  remove(@Param('subId') subId: string) {
    return this.subs.remove(subId);
  }
}
