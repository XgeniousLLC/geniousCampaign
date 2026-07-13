import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import type { EmailVerificationProvider, VerificationProviderResult } from './verification-provider.interface';

// Confirmed against a real live response (2026-07-13, mode=quick, a real
// REOON_API_KEY): { "status": "valid", "is_valid_syntax": true, ... } — quick
// mode's documented enum is valid|invalid|disposable|spamtrap ("safe" is a
// POWER-mode-only value, per Reoon's own API docs; the two are functionally
// equivalent "deliverable" outcomes but quick mode never actually returns
// "safe"). The original mapping only had a case for "safe" and fell through
// to "unknown" for every real quick-mode response — this is the fix.
interface ReoonResponse {
  status: 'valid' | 'safe' | 'invalid' | 'disposable' | 'spamtrap' | 'disabled' | 'inbox_full' | 'catch_all' | 'role_account' | 'unknown';
}

function mapReoonStatus(status: ReoonResponse['status']): VerificationProviderResult {
  switch (status) {
    case 'valid':
    case 'safe':
      return { status: 'valid', isDeliverable: true };
    case 'invalid':
    case 'disposable':
    case 'spamtrap':
    case 'disabled':
    case 'inbox_full':
      return { status: 'invalid', isDeliverable: false };
    case 'catch_all':
      return { status: 'risky', isDeliverable: false };
    default:
      return { status: 'unknown', isDeliverable: false };
  }
}

@Injectable()
export class ReoonProvider implements EmailVerificationProvider {
  constructor(private readonly settings: SettingsService) {}

  async verify(email: string): Promise<VerificationProviderResult> {
    const apiKey = this.settings.get('REOON_API_KEY');
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
