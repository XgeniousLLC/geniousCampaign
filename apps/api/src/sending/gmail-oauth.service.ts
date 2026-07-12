import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { encryptToken } from './token-encryption.util';
import { signOAuthState, verifyOAuthState } from './oauth-state.util';
import { SenderAccountService } from './sender-account.service';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

@Injectable()
export class GmailOAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly senderAccounts: SenderAccountService,
  ) {}

  private client() {
    const clientId = this.config.get<string>('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_OAUTH_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_OAUTH_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException(
        'Google OAuth is not configured — set GOOGLE_OAUTH_CLIENT_ID/CLIENT_SECRET/REDIRECT_URI in .env.',
      );
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /** Never fakes a working connect URL when unconfigured — throws instead. */
  getConnectUrl(): string {
    const encryptionSecret = this.config.get<string>('TOKEN_ENCRYPTION_KEY');
    if (!encryptionSecret) {
      throw new InternalServerErrorException('TOKEN_ENCRYPTION_KEY is not configured — cannot start an OAuth connect flow.');
    }
    const client = this.client();
    const state = signOAuthState(encryptionSecret);
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GMAIL_SCOPES,
      state,
    });
  }

  /** Exchanges the authorization code for tokens, encrypts the refresh
   * token at rest, and upserts (never duplicates) the SenderAccount row —
   * reconnecting the same mailbox updates its existing row (GC-044). */
  async handleCallback(code: string, state: string) {
    const encryptionSecret = this.config.get<string>('TOKEN_ENCRYPTION_KEY');
    if (!encryptionSecret) {
      throw new InternalServerErrorException('TOKEN_ENCRYPTION_KEY is not configured — cannot complete the OAuth connect flow.');
    }
    if (!verifyOAuthState(encryptionSecret, state)) {
      throw new InternalServerErrorException('Invalid or expired OAuth state — possible CSRF or a stale connect link.');
    }

    const client = this.client();
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
      throw new InternalServerErrorException('Could not determine the connected Gmail account email from Google.');
    }

    const encrypted = encryptToken(tokens.refresh_token, encryptionSecret);
    return this.senderAccounts.upsertGmailAccount(userinfo.email, userinfo.name ?? undefined, encrypted);
  }
}
