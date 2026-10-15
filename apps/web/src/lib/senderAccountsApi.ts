import { apiDelete, apiGet, apiPatch, apiPost } from './api';

export interface SenderAccount {
  id: string;
  provider: 'ses' | 'gmail';
  email: string;
  displayName: string | null;
  dailySendLimit: number;
  sentToday: number;
  isActive: boolean;
  awsRegion: string | null;
  sesConfigurationSet: string | null;
  hasCustomAwsCredentials: boolean;
  hasCustomGmailCredentials: boolean;
  createdAt: string;
}

export function listSenderAccounts() {
  return apiGet<SenderAccount[]>('/sender-accounts');
}

export interface GmailConnectInput {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

/** Blank input = use the shared Settings OAuth app; set = this mailbox's own
 * client id/secret (stored on the account after Google redirects back). */
export function getGmailConnectUrl(input?: GmailConnectInput) {
  return apiPost<{ authUrl: string }>('/sender-accounts/gmail/connect', input ?? {});
}

export interface SesAccountInput {
  email: string;
  displayName?: string;
  dailySendLimit?: number;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  sesConfigurationSet?: string;
}

export function createSesAccount(input: SesAccountInput) {
  return apiPost<SenderAccount>('/sender-accounts/ses', input);
}

export function updateSenderAccount(id: string, input: Partial<SesAccountInput & { isActive: boolean }>) {
  return apiPatch<SenderAccount>(`/sender-accounts/${id}`, input);
}

export function deleteSenderAccount(id: string) {
  return apiDelete<{ id: string }>(`/sender-accounts/${id}`);
}

export function sendTestEmail(id: string, to: string) {
  return apiPost<{ success: boolean; message: string }>(`/sender-accounts/${id}/send-test`, { to });
}
