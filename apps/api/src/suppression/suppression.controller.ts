import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuppressionService } from './suppression.service';

@Controller('suppression-list')
@UseGuards(JwtAuthGuard)
export class SuppressionController {
  constructor(private readonly suppression: SuppressionService) {}

  @Get()
  listAll() {
    return this.suppression.listAll();
  }
}
