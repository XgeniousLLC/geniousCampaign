import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

function base64url(input: Buffer): string {
  return input.toString('base64url');
}

/** Signed, single-use-in-spirit CSRF state param for the OAuth redirect
 * round-trip — Google's callback can't carry our JWT, so this is what
 * proves the callback corresponds to a connect flow we actually started. */
export function signOAuthState(secret: string): string {
  const nonce = base64url(randomBytes(16));
  const payload = base64url(Buffer.from(`${nonce}.${Date.now()}`, 'utf8'));
  const sig = base64url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}

const MAX_STATE_AGE_MS = 10 * 60 * 1000;

export function verifyOAuthState(secret: string, state: string): boolean {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) return false;

  const expectedSig = base64url(createHmac('sha256', secret).update(payload).digest());
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  const decoded = Buffer.from(payload, 'base64url').toString('utf8');
  const timestamp = Number(decoded.split('.')[1]);
  if (!Number.isFinite(timestamp)) return false;

  return Date.now() - timestamp < MAX_STATE_AGE_MS;
}
