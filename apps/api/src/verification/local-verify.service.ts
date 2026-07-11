import { Injectable } from '@nestjs/common';
import * as dns from 'node:dns/promises';
import { isDisposableDomain } from './disposable-domains';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LocalVerifyReason = 'invalid_syntax' | 'disposable_domain' | 'no_mx_record';

export interface LocalVerifyResult {
  valid: boolean;
  reason?: LocalVerifyReason;
}

@Injectable()
export class LocalVerifyService {
  async check(email: string): Promise<LocalVerifyResult> {
    if (!EMAIL_RE.test(email)) {
      return { valid: false, reason: 'invalid_syntax' };
    }

    const domain = email.split('@')[1];

    if (isDisposableDomain(domain)) {
      return { valid: false, reason: 'disposable_domain' };
    }

    try {
      const records = await dns.resolveMx(domain);
      if (!records || records.length === 0) {
        return { valid: false, reason: 'no_mx_record' };
      }
    } catch {
      return { valid: false, reason: 'no_mx_record' };
    }

    return { valid: true };
  }
}
