import { Module } from '@nestjs/common';
import { PasswordResetController } from './password-reset.controller';
import { PasswordResetService } from './password-reset.service';
import { AuthModule } from '../auth/auth.module';
import { SendingModule } from '../sending/sending.module';

@Module({
  imports: [AuthModule, SendingModule],
  controllers: [PasswordResetController],
  providers: [PasswordResetService],
})
export class PasswordResetModule {}
