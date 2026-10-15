import { google } from 'googleapis';
import type { SettingsService } from '../settings/settings.service';
import { decryptToken } from './token-encryption.util';

interface GmailAccount {
  gmailClientId?: string | null;
  gmailClientSecretEncrypted?: string | null;
  gmailRedirectUri?: string | null;
}

export interface GmailCreds {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

/**
 * Secret used to encrypt Gmail refresh tokens and per-account client secrets.
 * Prefers the dedicated TOKEN_ENCRYPTION_KEY when configured; otherwise falls
 * back to JWT_SECRET — the app's existing at-rest secret (see
 * token-encryption.util's appEncryptionSecret), so Gmail works without a
 * second required env var. Both encrypt and decrypt go through this, so a
 * deployment that set TOKEN_ENCRYPTION_KEY keeps reading its old tokens.
 */
export function gmailTokenSecret(settings: SettingsService): string {
  return (
    settings.get('TOKEN_ENCRYPTION_KEY') ||
    settings.get('JWT_SECRET') ||
    ''
  );
}

/** Effective OAuth app for a mailbox: its own client id/secret/redirect when
 * set, otherwise the shared Settings > Integrations app. Lets several Google
 * Workspace domains (each with their own OAuth client) connect side by side. */
export function gmailCredsFor(
  account: GmailAccount | undefined | null,
  settings: SettingsService,
  encryptionSecret: string,
): GmailCreds {
  const clientId = account?.gmailClientId || settings.get('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = account?.gmailClientSecretEncrypted
    ? decryptToken(account.gmailClientSecretEncrypted, encryptionSecret)
    : settings.get('GOOGLE_OAUTH_CLIENT_SECRET');
  const redirectUri =
    account?.gmailRedirectUri || settings.get('GOOGLE_OAUTH_REDIRECT_URI');
  return { clientId, clientSecret, redirectUri };
}

/** Authenticated OAuth2 client for a mailbox + its stored refresh token.
 * Throws when neither per-account nor shared credentials exist.
 * Return type is inferred from googleapis' own OAuth2 so it stays assignable
 * to `google.gmail({ auth })` (googleapis bundles its own google-auth-library
 * copy, so an explicit import from the root package wouldn't match). */
export function gmailAuthClient(
  account: GmailAccount | undefined | null,
  settings: SettingsService,
  encryptionSecret: string,
  refreshToken: string,
) {
  const { clientId, clientSecret, redirectUri } = gmailCredsFor(
    account,
    settings,
    encryptionSecret,
  );
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Gmail OAuth is not configured for this account — set its own client id/secret or the shared GOOGLE_OAUTH_* values.',
    );
  }
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}
