import { Module } from '@nestjs/common';
import { SequencesController } from './sequences.controller';
import { SubsequencesController } from './subsequences.controller';
import { SequencesService } from './sequences.service';
import { SubsequenceService } from '../inbox/inbox-events.listener';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';

@Module({
  imports: [AuthModule, DbModule],
  controllers: [SequencesController, SubsequencesController],
  providers: [SequencesService, SubsequenceService],
  exports: [SequencesService],
})
export class SequencesModule {}
