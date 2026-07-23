import { Body, Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DebugLogService } from './debug-log.service';
import { CreateErrorLogDto } from './dto/create-error-log.dto';

@Controller('debug-log')
export class DebugLogController {
  constructor(private readonly debugLog: DebugLogService) {}

  // Deliberately ungated — an error can happen on the login page itself,
  // before any token exists, and this only ever writes a log row (never
  // reads anything back to the caller).
  @Post()
  async report(@Body() dto: CreateErrorLogDto) {
    await this.debugLog.record(dto);
    return { received: true };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  listAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.debugLog.listAll(page ? parseInt(page, 10) : undefined, limit ? parseInt(limit, 10) : undefined);
  }

  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  async clearAll() {
    await this.debugLog.clearAll();
    return { cleared: true };
  }
}
