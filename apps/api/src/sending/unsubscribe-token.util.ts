import { createHmac, timingSafeEqual } from 'node:crypto';

function base64url(input: Buffer): string {
  return input.toString('base64url');
}

export function signUnsubscribeToken(secret: string, email: string): string {
  const payload = base64url(Buffer.from(email, 'utf8'));
  const sig = base64url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(secret: string, token: string): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;

  const expectedSig = base64url(createHmac('sha256', secret).update(payload).digest());
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    return Buffer.from(payload, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}
