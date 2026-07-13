import { Injectable } from '@nestjs/common';
import { eq, gt, and, inArray, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { contacts, verificationResults } from '../db/schema';

export interface VerificationStats {
  total: number;
  valid: number;
  invalid: number;
  risky: number;
  // No non-expired verification_results row at all — covers both
  // never-checked contacts and the 'unknown' cached outcome, since both
  // mean "we don't have confidence this is deliverable" for this summary.
  unverified: number;
}

@Injectable()
export class VerificationStatsService {
  constructor(private readonly drizzle: DrizzleService) {}

  /** Real per-status counts computed from verification_results joined
   * against contacts — GC-062's acceptance criteria explicitly rules out
   * placeholder numbers. Only non-expired cache rows count (GC-049's 6-month
   * TTL — an expired result is the same as never having checked). */
  async getStats(): Promise<VerificationStats> {
    const [{ total }] = await this.drizzle.db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(contacts);

    const rows = await this.drizzle.db
      .select({
        status: verificationResults.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(verificationResults)
      .innerJoin(contacts, eq(contacts.email, verificationResults.email))
      .where(and(gt(verificationResults.expiresAt, new Date()), inArray(verificationResults.status, ['valid', 'invalid', 'risky'])))
      .groupBy(verificationResults.status);

    const byStatus = new Map(rows.map((r) => [r.status, r.count]));
    const valid = byStatus.get('valid') ?? 0;
    const invalid = byStatus.get('invalid') ?? 0;
    const risky = byStatus.get('risky') ?? 0;

    return { total, valid, invalid, risky, unverified: Math.max(0, total - valid - invalid - risky) };
  }

  /** Contacts worth bulk-verifying: active (no point spending API calls on
   * ones we'd never send to anyway) with no current, non-expired result. */
  async listUnverifiedActiveContacts() {
    const verifiedEmails = await this.drizzle.db
      .select({ email: verificationResults.email })
      .from(verificationResults)
      .where(gt(verificationResults.expiresAt, new Date()));
    const verifiedSet = new Set(verifiedEmails.map((r) => r.email));

    const activeContacts = await this.drizzle.db.query.contacts.findMany({ where: eq(contacts.status, 'active') });
    return activeContacts.filter((c) => !verifiedSet.has(c.email));
  }
}
