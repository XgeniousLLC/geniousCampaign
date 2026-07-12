import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { R2Service } from './r2.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [R2Service],
})
export class UploadsModule {}
