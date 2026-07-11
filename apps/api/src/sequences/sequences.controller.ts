import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { SequencesService } from './sequences.service';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';

@Controller('sequences')
export class SequencesController {
  constructor(private readonly sequencesService: SequencesService) {}

  @Post()
  create(@Body() dto: CreateSequenceDto) {
    return this.sequencesService.create(dto);
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
  update(@Param('id') id: string, @Body() dto: UpdateSequenceDto) {
    return this.sequencesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sequencesService.remove(id);
  }

  @Get(':id/steps')
  listSteps(@Param('id') id: string) {
    return this.sequencesService.listSteps(id);
  }

  @Post(':id/steps')
  addStep(@Param('id') id: string, @Body() dto: CreateStepDto) {
    return this.sequencesService.addStep(id, dto);
  }

  @Patch(':id/steps/:stepId')
  updateStep(@Param('id') id: string, @Param('stepId') stepId: string, @Body() dto: UpdateStepDto) {
    return this.sequencesService.updateStep(id, stepId, dto);
  }

  @Delete(':id/steps/:stepId')
  removeStep(@Param('id') id: string, @Param('stepId') stepId: string) {
    return this.sequencesService.removeStep(id, stepId);
  }

  @Post(':id/steps/reorder')
  reorderSteps(@Param('id') id: string, @Body() dto: ReorderStepsDto) {
    return this.sequencesService.reorderSteps(id, dto);
  }
}
