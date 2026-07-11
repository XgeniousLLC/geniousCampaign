import { createHmac, timingSafeEqual } from 'node:crypto';

export function computeHmacSignature(secret: string, rawBody: Buffer): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifyHmacSignature(secret: string, rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;

  const expected = computeHmacSignature(secret, rawBody);
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signatureHeader, 'hex');

  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
