import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { RateLimitError, parseRetryAfterMs, type EmailVerificationProvider, type VerificationProviderResult } from './verification-provider.interface';

interface NeverBounceResponse {
  status: 'success' | 'auth_failure' | 'temp_unavail' | 'throttle_triggered' | 'general_failure';
  result?: 'valid' | 'invalid' | 'disposable' | 'catchall' | 'unknown';
}

/** NeverBounce's documented result values mapped to our 3-state model. Not
 * verified against a live response yet — no NEVERBOUNCE_API_KEY provided
 * this session; re-check field names once Sharifur supplies a real key. */
function mapNeverBounceResult(result: NeverBounceResponse['result']): VerificationProviderResult {
  switch (result) {
    case 'valid':
      return { status: 'valid', isDeliverable: true };
    case 'invalid':
    case 'disposable':
      return { status: 'invalid', isDeliverable: false };
    case 'catchall':
      return { status: 'risky', isDeliverable: false };
    default:
      return { status: 'unknown', isDeliverable: false };
  }
}

@Injectable()
export class NeverBounceProvider implements EmailVerificationProvider {
  constructor(private readonly settings: SettingsService) {}

  async verify(email: string): Promise<VerificationProviderResult> {
    const apiKey = this.settings.get('NEVERBOUNCE_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('NEVERBOUNCE_API_KEY is not configured — cannot call NeverBounce for real.');
    }

    const url = new URL('https://api.neverbounce.com/v4/single/check');
    url.searchParams.set('email', email);
    url.searchParams.set('key', apiKey);

    const res = await fetch(url.toString());
    if (res.status === 429) {
      throw new RateLimitError('NeverBounce rate limit hit (429)', parseRetryAfterMs(res.headers.get('retry-after')));
    }
    if (!res.ok) {
      throw new Error(`NeverBounce API returned ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as NeverBounceResponse;
    // throttle_triggered is NeverBounce's own rate-limit signal, sent with a
    // 200 OK — it never surfaces as an HTTP 429.
    if (data.status === 'throttle_triggered') {
      throw new RateLimitError('NeverBounce rate limit hit (throttle_triggered)');
    }
    if (data.status !== 'success') {
      throw new Error(`NeverBounce API responded with status: ${data.status}`);
    }
    return mapNeverBounceResult(data.result);
  }
}
