import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { LocalVerifyService } from './local-verify.service';
import { EmailVerificationService } from './email-verification.service';
import { CheckEmailDto } from './dto/check-email.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('verification')
export class VerificationController {
  constructor(
    private readonly localVerify: LocalVerifyService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  @Post('local-check')
  check(@Body() dto: CheckEmailDto) {
    return this.localVerify.check(dto.email);
  }

  // The paid-API step (GC-049) — gated behind auth since every call can
  // cost money once real Reoon/NeverBounce keys are configured.
  @Post('check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'editor')
  verify(@Body() dto: CheckEmailDto) {
    return this.emailVerification.verify(dto.email);
  }
}
