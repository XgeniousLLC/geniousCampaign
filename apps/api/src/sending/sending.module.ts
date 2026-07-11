import { Module } from '@nestjs/common';
import { SesSenderProvider } from './ses-sender.provider';

@Module({
  providers: [SesSenderProvider],
  exports: [SesSenderProvider],
})
export class SendingModule {}
