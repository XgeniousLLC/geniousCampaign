import { apiGet } from './api';

export interface AnalyticsOverview {
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
  complainedCount: number;
  suppressedCount: number;
  totalCount: number;
  openCount: number;
  clickCount: number;
  openRatePct: number;
  clickRatePct: number;
  bounceRatePct: number;
}

export interface TrendPoint {
  date: string;
  opens: number;
  clicks: number;
}

export interface RecentCampaign {
  id: string;
  name: string;
  status: string;
  sentCount: number;
  openCount: number;
  clickCount: number;
  createdAt: string;
}

export interface RecentActivityItem {
  id: string;
  type: 'open' | 'click';
  url: string | null;
  createdAt: string;
  sendId: string;
  campaignName: string | null;
}

export interface PublicSummary {
  sentCount: number;
  openRatePct: number;
  contactCount: number;
}

/** Unauthenticated — safe to call before login (real aggregate counts only). */
export function getPublicSummary() {
  return apiGet<PublicSummary>('/analytics/public/summary');
}

export function getOverview(days = 30) {
  return apiGet<AnalyticsOverview>(`/analytics/overview?days=${days}`);
}

export function getTrend(days = 30) {
  return apiGet<TrendPoint[]>(`/analytics/trend?days=${days}`);
}

export function getRecentCampaigns(limit = 5) {
  return apiGet<RecentCampaign[]>(`/analytics/recent-campaigns?limit=${limit}`);
}

export function getRecentActivity(limit = 10) {
  return apiGet<RecentActivityItem[]>(`/analytics/recent-activity?limit=${limit}`);
}
