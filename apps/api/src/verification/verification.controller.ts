import { Body, Controller, Post } from '@nestjs/common';
import { LocalVerifyService } from './local-verify.service';
import { CheckEmailDto } from './dto/check-email.dto';

@Controller('verification')
export class VerificationController {
  constructor(private readonly localVerify: LocalVerifyService) {}

  @Post('local-check')
  check(@Body() dto: CheckEmailDto) {
    return this.localVerify.check(dto.email);
  }
}
