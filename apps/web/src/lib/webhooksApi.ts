import { apiGet, apiPost, apiDelete } from './api';

export interface WebhookEndpoint {
  id: string;
  name: string;
  slug: string;
  secret: string;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  slug: string;
  signatureValid: boolean;
  statusCode: string | null;
  error: string | null;
  receivedAt: string;
}

export interface OutboundSubscription {
  id: string;
  name: string;
  url: string;
  secret: string;
  eventTypes: string[];
  isActive: boolean;
  createdAt: string;
}

export function listWebhookEndpoints() {
  return apiGet<WebhookEndpoint[]>('/webhook-endpoints');
}

export function createWebhookEndpoint(input: { name: string; slug: string }) {
  return apiPost<WebhookEndpoint>('/webhook-endpoints', input);
}

export function listWebhookDeliveries(slug: string) {
  return apiGet<WebhookDelivery[]>(`/webhook-endpoints/${slug}/deliveries`);
}

export function listOutboundSubscriptions() {
  return apiGet<OutboundSubscription[]>('/outbound-webhook-subscriptions');
}

export function createOutboundSubscription(input: { name: string; url: string; eventTypes: string[] }) {
  return apiPost<OutboundSubscription>('/outbound-webhook-subscriptions', input);
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  defaultListId: string | null;
  defaultTagIds: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreatedApiKey extends ApiKey {
  // Only present in the create response — never returned again after this.
  key: string;
}

export function listApiKeys() {
  return apiGet<ApiKey[]>('/api-keys');
}

export function createApiKey(input: { name: string; defaultListId?: string; defaultTagIds?: string[] }) {
  return apiPost<CreatedApiKey>('/api-keys', input);
}

export function revokeApiKey(id: string) {
  return apiDelete<{ id: string }>(`/api-keys/${id}`);
}
