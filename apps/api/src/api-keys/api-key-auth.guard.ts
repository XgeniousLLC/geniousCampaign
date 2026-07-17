import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeysService } from './api-keys.service';
import { hashApiKey } from './api-key.util';

// Separate auth mechanism from JwtAuthGuard/RolesGuard — the public API
// (POST /api/v1/contacts) is called by external tools that hold a bearer
// key, not a logged-in user's JWT. Populates request.apiKey so the
// controller can read defaultListId/defaultTagIds without a second lookup.
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { apiKey?: unknown }>();
    const header = request.headers['x-api-key'];
    const raw = Array.isArray(header) ? header[0] : header;
    if (!raw) {
      throw new UnauthorizedException('Missing X-Api-Key header');
    }

    const key = await this.apiKeys.findByHash(hashApiKey(raw));
    if (!key) {
      throw new UnauthorizedException('Invalid API key');
    }
    if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('API key expired');
    }

    request.apiKey = key;
    await this.apiKeys.touchLastUsed(key.id);
    return true;
  }
}
