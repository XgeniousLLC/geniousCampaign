import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmailVerificationProvider, VerificationProviderResult } from './verification-provider.interface';

interface ReoonResponse {
  status: 'safe' | 'invalid' | 'disposable' | 'spamtrap' | 'catch_all' | 'inbox_full' | 'unknown';
}

/** Reoon's documented status values mapped to our 3-state model. Not
 * verified against a live response yet — no REOON_API_KEY provided this
 * session; re-check field names once Sharifur supplies a real key. */
function mapReoonStatus(status: ReoonResponse['status']): VerificationProviderResult {
  switch (status) {
    case 'safe':
      return { status: 'valid', isDeliverable: true };
    case 'invalid':
    case 'disposable':
    case 'spamtrap':
      return { status: 'invalid', isDeliverable: false };
    case 'catch_all':
      return { status: 'risky', isDeliverable: false };
    default:
      return { status: 'unknown', isDeliverable: false };
  }
}

@Injectable()
export class ReoonProvider implements EmailVerificationProvider {
  constructor(private readonly config: ConfigService) {}

  async verify(email: string): Promise<VerificationProviderResult> {
    const apiKey = this.config.get<string>('REOON_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('REOON_API_KEY is not configured — cannot call Reoon for real.');
    }

    const url = new URL('https://emailverifier.reoon.com/api/v1/verify');
    url.searchParams.set('email', email);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('mode', 'quick');

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Reoon API returned ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as ReoonResponse;
    return mapReoonStatus(data.status);
  }
}
