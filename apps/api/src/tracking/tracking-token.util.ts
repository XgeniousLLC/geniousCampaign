import { createHmac, timingSafeEqual } from 'node:crypto';

function base64url(input: Buffer): string {
  return input.toString('base64url');
}

/** Signs an arbitrary JSON-serializable payload — used for both open pixel
 * and click-redirect tokens so tracking URLs never expose raw sequential
 * send IDs (CLAUDE.md/GC-019 acceptance criteria). */
export function signTrackingToken(secret: string, payload: unknown): string {
  const encoded = base64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = base64url(createHmac('sha256', secret).update(encoded).digest());
  return `${encoded}.${sig}`;
}

export function verifyTrackingToken<T>(secret: string, token: string): T | null {
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;

  const expectedSig = base64url(createHmac('sha256', secret).update(encoded).digest());
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}
