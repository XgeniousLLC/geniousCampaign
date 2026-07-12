import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { TrackingService } from './tracking.service';

// A 1x1 transparent GIF, served for every open-pixel request regardless of
// token validity (a broken pixel would look suspicious in mail clients).
const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7', 'base64');

@Controller('t')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Get('o/:token')
  @Header('Content-Type', 'image/gif')
  @Header('Cache-Control', 'no-store')
  async open(@Param('token') token: string, @Res() res: Response) {
    const payload = this.tracking.verifyOpenToken(token);
    if (payload) {
      await this.tracking.recordOpen(payload.sendId);
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
