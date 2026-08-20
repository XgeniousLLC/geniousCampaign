import { Controller, Get, Header, Param, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { TrackingService } from './tracking.service';
import { DebugLogService } from '../debug-log/debug-log.service';

// A 1x1 transparent GIF, served for every open-pixel request regardless of
// token validity (a broken pixel would look suspicious in mail clients).
const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7', 'base64');

@Controller('t')
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(
    private readonly tracking: TrackingService,
    private readonly debugLog: DebugLogService,
  ) {}

  @Get('o/:token')
  @Header('Content-Type', 'image/gif')
  @Header('Cache-Control', 'no-store')
  async open(@Param('token') token: string, @Res() res: Response) {
    const tokenPreview = token.substring(0, 20);
    this.logger.log(`[PIXEL_REQUEST] Open pixel requested with token: ${tokenPreview}...`);
    await this.debugLog.record({
      source: 'backend',
      message: `[PIXEL_REQUEST] Open pixel requested with token: ${tokenPreview}...`,
      context: { endpoint: '/t/o/:token', tokenPreview },
    });

    const payload = this.tracking.verifyOpenToken(token);
    if (payload) {
      this.logger.log(`[PIXEL_VALID] Token verified for sendId: ${payload.sendId}`);
      await this.debugLog.record({
        source: 'backend',
        message: `[PIXEL_VALID] Token verified for sendId: ${payload.sendId}`,
        context: { sendId: payload.sendId },
      });
      await this.tracking.recordOpen(payload.sendId);
      this.logger.log(`[PIXEL_RECORDED] Open event recorded for sendId: ${payload.sendId}`);
      await this.debugLog.record({
        source: 'backend',
        message: `[PIXEL_RECORDED] Open event recorded for sendId: ${payload.sendId}`,
        context: { sendId: payload.sendId },
      });
    } else {
      this.logger.warn(`[PIXEL_INVALID] Token verification failed for token: ${tokenPreview}...`);
      await this.debugLog.record({
        source: 'backend',
        message: `[PIXEL_INVALID] Token verification failed for token: ${tokenPreview}...`,
        context: { tokenPreview, error: 'Token verification failed' },
      });
    }
    res.status(200).send(TRANSPARENT_GIF);
  }

  @Get('c/:token')
  async click(@Param('token') token: string, @Res() res: Response) {
    const payload = this.tracking.verifyClickToken(token);
    if (!payload) {
      res.status(400).send('Invalid tracking link.');
      return;
    }
    await this.tracking.recordClick(payload.sendId, payload.url);
    res.redirect(302, payload.url);
  }
}
