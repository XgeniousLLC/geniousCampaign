import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { apiKeys } from '../db/schema';

export type AuthenticatedApiKey = typeof apiKeys.$inferSelect;

// Populated by ApiKeyAuthGuard — mirrors CurrentUser's shape for the JWT path.
export const CurrentApiKey = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedApiKey => {
  const request = ctx.switchToHttp().getRequest();
  return request.apiKey;
});
