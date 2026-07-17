import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

// Runs before ApiKeyAuthGuard (see PublicApiController's @UseGuards order) so
// a flood of invalid keys from one caller is still capped, not just valid
// ones — tracked by the raw X-Api-Key header value (never logged/stored)
// rather than IP, since external tools calling this from a shared egress IP
// shouldn't throttle each other.
@Injectable()
export class PublicApiThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const header = req.headers['x-api-key'];
    const raw = Array.isArray(header) ? header[0] : header;
    return raw ?? req.ip ?? 'unknown';
  }
}
