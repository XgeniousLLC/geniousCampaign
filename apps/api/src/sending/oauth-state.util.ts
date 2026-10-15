import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

function base64url(input: Buffer): string {
  return input.toString('base64url');
}

/** Signed, single-use-in-spirit CSRF state param for the OAuth redirect
 * round-trip — Google's callback can't carry our JWT, so this is what
 * proves the callback corresponds to a connect flow we actually started.
 * `sessionId` (a pending-credentials row id) rides along so the callback can
 * use the same OAuth app that initiated the flow. */
export function signOAuthState(secret: string, sessionId = ''): string {
  const nonce = base64url(randomBytes(16));
  const payload = base64url(
    Buffer.from(`${sessionId}.${nonce}.${Date.now()}`, 'utf8'),
  );
  const sig = base64url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}

const MAX_STATE_AGE_MS = 10 * 60 * 1000;

/** Verifies the signature + age and returns the carried session id, or null
 * if the state is forged/stale. */
export function readOAuthState(secret: string, state: string): string | null {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) return null;

  const expectedSig = base64url(
    createHmac('sha256', secret).update(payload).digest(),
  );
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  const decoded = Buffer.from(payload, 'base64url').toString('utf8');
  const parts = decoded.split('.');
  const timestamp = Number(parts[parts.length - 1]);
  if (!Number.isFinite(timestamp)) return null;
  if (Date.now() - timestamp >= MAX_STATE_AGE_MS) return null;

  // `<sessionId>.<nonce>.<timestamp>` — sessionId is a uuid (no dots).
  return parts.slice(0, -2).join('.');
}
