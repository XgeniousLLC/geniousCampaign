import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TriggersService } from './triggers.service';
import { CreateTriggerDto } from './dto/create-trigger.dto';
import { UpdateTriggerDto } from './dto/update-trigger.dto';

@Controller('triggers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TriggersController {
  constructor(private readonly triggersService: TriggersService) {}

  @Post()
  @Roles('owner', 'editor')
  create(@Body() dto: CreateTriggerDto) {
    return this.triggersService.create(dto);
  }

  @Get()
  findAll() {
    return this.triggersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.triggersService.findOne(id);
  }

  @Patch(':id')
  @Roles('owner', 'editor')
  update(@Param('id') id: string, @Body() dto: UpdateTriggerDto) {
    return this.triggersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('owner', 'editor')
  remove(@Param('id') id: string) {
    return this.triggersService.remove(id);
  }
}
