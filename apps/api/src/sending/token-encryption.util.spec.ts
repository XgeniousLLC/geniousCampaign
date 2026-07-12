import { encryptToken, decryptToken } from './token-encryption.util';

describe('token-encryption.util', () => {
  it('round-trips a refresh token', () => {
    const secret = 'test-encryption-secret';
    const plaintext = '1//0gABCDEF-refresh-token-value';
    const encrypted = encryptToken(plaintext, secret);

    expect(encrypted).not.toContain(plaintext);
    expect(decryptToken(encrypted, secret)).toBe(plaintext);
  });

  it('fails to decrypt with the wrong secret (auth tag mismatch)', () => {
    const encrypted = encryptToken('secret-value', 'correct-secret');
    expect(() => decryptToken(encrypted, 'wrong-secret')).toThrow();
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const secret = 'test-encryption-secret';
    const a = encryptToken('same-plaintext', secret);
    const b = encryptToken('same-plaintext', secret);
    expect(a).not.toBe(b);
  });
});
