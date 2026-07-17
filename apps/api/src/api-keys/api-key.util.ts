import { randomBytes, createHash } from 'node:crypto';

// Prefix identifies these as geniusCampaign public-API keys at a glance
// (same idea as stripe's sk_/pk_ prefixes) — purely cosmetic, carries no
// secret material. keyPrefix (stored, shown in the UI list) is a short
// slice of the raw key so an admin can tell keys apart without the full
// value ever being persisted or re-displayable after creation.
const KEY_PREFIX = 'gcp';

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `${KEY_PREFIX}_${randomBytes(24).toString('base64url')}`;
  return { raw, prefix: raw.slice(0, 12), hash: hashApiKey(raw) };
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
