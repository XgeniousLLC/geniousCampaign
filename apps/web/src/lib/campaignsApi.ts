import { apiGet, apiPost } from './api';

export type CampaignStatus = 'draft' | 'sending' | 'sent' | 'failed';
export type SendStatus = 'sent' | 'failed' | 'suppressed' | 'bounced' | 'complained';

export type CampaignAudienceType = 'list' | 'tags' | 'contacts';

export interface Campaign {
  id: string;
  name: string;
  templateId: string;
  audienceType: CampaignAudienceType;
  listId: string | null;
  tagIds: string[] | null;
  contactIds: string[] | null;
  status: CampaignStatus;
  sentCount: number;
  failedCount: number;
  suppressedCount: number;
  isDryRun: boolean;
  sendToEmail: string | null;
  createdAt: string;
  updatedAt: string;
  // Present on list responses only (GET /campaigns) — computed server-side.
  openCount?: number;
  clickCount?: number;
}

export interface CampaignSend {
  id: string;
  contactId: string;
  status: SendStatus;
  provider: 'ses' | 'gmail';
  error: string | null;
  isDryRun: boolean;
  sentAt: string | null;
  createdAt: string;
  opened: boolean;
  clicked: boolean;
}

export interface SendCampaignResult {
  id: string;
  status: 'queued' | 'confirmation_required';
  recipientCount?: number;
  threshold?: number;
}

export function listCampaigns() {
  return apiGet<Campaign[]>('/campaigns');
}

export function getCampaign(id: string) {
  return apiGet<Campaign>(`/campaigns/${id}`);
}

export function getCampaignSends(id: string) {
  return apiGet<CampaignSend[]>(`/campaigns/${id}/sends`);
}

export function createCampaign(input: {
  name: string;
  templateId: string;
  audienceType?: CampaignAudienceType;
  listId?: string;
  tagIds?: string[];
  contactIds?: string[];
  isDryRun?: boolean;
  sendToEmail?: string;
}) {
  return apiPost<Campaign>('/campaigns', input);
}

export function sendCampaign(id: string, confirmed?: boolean) {
  return apiPost<SendCampaignResult>(`/campaigns/${id}/send`, { confirmed });
}
