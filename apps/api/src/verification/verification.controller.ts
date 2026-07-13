import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { LocalVerifyService } from './local-verify.service';
import { EmailVerificationService } from './email-verification.service';
import { VerificationStatsService } from './verification-stats.service';
import { CheckEmailDto } from './dto/check-email.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('verification')
export class VerificationController {
  constructor(
    private readonly localVerify: LocalVerifyService,
    private readonly emailVerification: EmailVerificationService,
    private readonly stats: VerificationStatsService,
    @InjectQueue('bulk-verify') private readonly bulkVerifyQueue: Queue,
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

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getStats() {
    return this.stats.getStats();
  }

  // GC-062 — enqueues a real BullMQ job rather than looping over
  // potentially thousands of contacts in the request cycle (invariant 10).
  @Post('bulk-verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'editor')
  async bulkVerify() {
    const job = await this.bulkVerifyQueue.add('bulk-verify', {});
    return { jobId: job.id };
  }

  @Get('bulk-verify/:jobId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async bulkVerifyStatus(@Param('jobId') jobId: string) {
    const job = await this.bulkVerifyQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Bulk verify job ${jobId} not found`);
    }
    const state = await job.getState();
    return {
      jobId: job.id,
      state,
      progress: job.progress,
      result: state === 'completed' ? job.returnvalue : undefined,
      failedReason: state === 'failed' ? job.failedReason : undefined,
    };
  }
}
