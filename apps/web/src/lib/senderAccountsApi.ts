import { apiGet } from './api';

export interface SenderAccount {
  id: string;
  provider: 'ses' | 'gmail';
  email: string;
  displayName: string | null;
  dailySendLimit: number;
  sentToday: number;
  isActive: boolean;
  createdAt: string;
}

export function listSenderAccounts() {
  return apiGet<SenderAccount[]>('/sender-accounts');
}

export function getGmailConnectUrl() {
  return apiGet<{ authUrl: string }>('/sender-accounts/gmail/connect');
}
