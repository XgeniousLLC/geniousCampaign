import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/** JWT_SECRET already gates the whole app's auth boundary and is guaranteed
 * to be set for the app to run at all — reused as the encryption secret for
 * anything stored at rest (settings, per-account AWS credentials) rather
 * than inventing a second required "encryption key" env var. Same reasoning
 * as SettingsService's own encryptionSecret(). */
export function appEncryptionSecret(config: ConfigService): string {
  return config.get<string>('JWT_SECRET')!;
}

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, 'genius-campaign-token-encryption', 32);
}

/** AES-256-GCM — refresh tokens are never stored in plaintext (GC-044). */
export function encryptToken(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptToken(encrypted: string, secret: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split(':');
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Malformed encrypted token — expected iv:authTag:ciphertext');
  }
  const key = deriveKey(secret);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]);
  return plaintext.toString('utf8');
}
