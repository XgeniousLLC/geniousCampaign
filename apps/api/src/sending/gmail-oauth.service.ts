import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { google } from 'googleapis';
import { encryptToken, decryptToken } from './token-encryption.util';
import { signOAuthState, readOAuthState } from './oauth-state.util';
import { SenderAccountService } from './sender-account.service';
import { gmailTokenSecret } from './gmail-client.util';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

export interface GmailConnectInput {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

@Injectable()
export class GmailOAuthService {
  constructor(
    private readonly settings: SettingsService,
    private readonly senderAccounts: SenderAccountService,
  ) {}

  /**
   * Builds the Google consent URL. When the admin supplies their own client
   * id + secret, those are stashed in a pending session (the signed `state`
   * points at it) so the callback can exchange the code with the SAME OAuth
   * app, then persist them on the mailbox. Otherwise the shared Settings app
   * is used and the mailbox keeps inheriting it.
   */
  async getConnectUrl(input: GmailConnectInput = {}): Promise<string> {
    const encryptionSecret = gmailTokenSecret(this.settings);
    if (!encryptionSecret) {
      throw new InternalServerErrorException(
        'No encryption key available (set TOKEN_ENCRYPTION_KEY or JWT_SECRET) — cannot start an OAuth connect flow.',
      );
    }

    const isCustom = !!(input.clientId && input.clientSecret);
    const clientId =
      input.clientId || this.settings.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret =
      input.clientSecret || this.settings.get('GOOGLE_OAUTH_CLIENT_SECRET');
    const redirectUri =
      input.redirectUri || this.settings.get('GOOGLE_OAUTH_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException(
        'Google OAuth is not configured — provide a client id and secret for this mailbox, or set the shared Google OAuth app first.',
      );
    }

    const session = await this.senderAccounts.createGmailOauthSession({
      clientId,
      clientSecretEncrypted: encryptToken(clientSecret, encryptionSecret),
      redirectUri,
      isCustom,
    });
    const state = signOAuthState(encryptionSecret, session.id);
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GMAIL_SCOPES,
      state,
    });
  }

  /** Exchanges the authorization code for tokens (using the OAuth app the
   * connect flow started with), encrypts the refresh token at rest, and
   * upserts (never duplicates) the SenderAccount row — reconnecting the same
   * mailbox updates its existing row (GC-044). */
  async handleCallback(code: string, state: string) {
    const encryptionSecret = gmailTokenSecret(this.settings);
    if (!encryptionSecret) {
      throw new InternalServerErrorException(
        'No encryption key available (set TOKEN_ENCRYPTION_KEY or JWT_SECRET) — cannot complete the OAuth connect flow.',
      );
    }
    const sessionId = readOAuthState(encryptionSecret, state);
    if (!sessionId) {
      throw new InternalServerErrorException(
        'Invalid or expired OAuth state — possible CSRF or a stale connect link.',
      );
    }
    const session =
      await this.senderAccounts.getGmailOauthSession(sessionId);
    if (!session) {
      throw new InternalServerErrorException(
        'This connect link has expired — start the connect flow again.',
      );
    }

    const clientSecret = decryptToken(
      session.clientSecretEncrypted,
      encryptionSecret,
    );
    const client = new google.auth.OAuth2(
      session.clientId,
      clientSecret,
      session.redirectUri,
    );
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new InternalServerErrorException(
        'Google did not return a refresh token — this mailbox may already be connected elsewhere; revoke access at myaccount.google.com/permissions and reconnect.',
      );
    }
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data: userinfo } = await oauth2.userinfo.get();
    if (!userinfo.email) {
      throw new InternalServerErrorException(
        'Could not determine the connected Gmail account email from Google.',
      );
    }

    const encrypted = encryptToken(tokens.refresh_token, encryptionSecret);
    const account = await this.senderAccounts.upsertGmailAccount(
      userinfo.email,
      userinfo.name ?? undefined,
      encrypted,
      session.isCustom
        ? {
            clientId: session.clientId,
            clientSecretEncrypted: session.clientSecretEncrypted,
            redirectUri: session.redirectUri,
          }
        : null,
    );
    await this.senderAccounts.deleteGmailOauthSession(session.id);
    return account;
  }
}
