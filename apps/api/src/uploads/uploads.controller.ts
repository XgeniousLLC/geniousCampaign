import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { R2Service } from './r2.service';
import { ConfigureCorsDto } from './dto/configure-cors.dto';
import { PresignUploadDto } from './dto/presign-upload.dto';

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadsController {
  constructor(private readonly r2: R2Service) {}

  @Post('presign')
  @Roles('owner', 'editor')
  presign(@Body() dto: PresignUploadDto) {
    return this.r2.presignUpload(dto.filename, dto.contentType);
  }

  // Rewriting bucket policy is infra-level, owner-only (the Settings >
  // Integrations UI that calls this is owner-only too). The calling web
  // app's own Origin header is always included, so one click from Settings
  // authorizes exactly the app in use — no URL to type, nothing to mismatch.
  @Post('cors')
  @Roles('owner')
  configureCors(@Req() req: Request, @Body() dto: ConfigureCorsDto) {
    const origins = [...(dto.origins ?? [])];
    const requestOrigin = req.headers['origin'];
    if (typeof requestOrigin === 'string' && requestOrigin) origins.push(requestOrigin);
    return this.r2.configureCors(origins);
  }
}
