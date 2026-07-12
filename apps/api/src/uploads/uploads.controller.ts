import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { R2Service } from './r2.service';
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
}
