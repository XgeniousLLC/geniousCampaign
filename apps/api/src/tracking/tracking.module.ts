import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingDomainController } from './tracking-domain.controller';
import { TrackingService } from './tracking.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TrackingController, TrackingDomainController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
