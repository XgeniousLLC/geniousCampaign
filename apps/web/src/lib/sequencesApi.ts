import { apiDelete, apiGet, apiPatch, apiPost } from './api';
import type { ConditionTree } from '@genius-campaign/shared';

export type StepType = 'send_email' | 'wait' | 'condition' | 'exit';
export type DelayUnit = 'minutes' | 'hours' | 'days';

export interface Sequence {
  id: string;
  name: string;
  description: string | null;
  // Sequence-level on/off switch — blocks new enrollments (manual, public
  // API, and trigger-driven) when false. Doesn't affect contacts already
  // enrolled; that's the separate per-enrollment pause/resume/stop control.
  isActive: boolean;
  // GC-130 (revised) — global sender for every send_email step in this
  // sequence; null = auto-pick. Not configurable per step.
  senderAccountId?: string | null;
  // Multi-sender set — step 1 rotates across these, winner sticks per contact.
  senderAccountIds?: string[];
  fromName?: string | null;
  replyTo?: string | null;
  // Set when this sequence is the child of a subsequence rule — settings are
  // inherited from the root parent and it is hidden from the sequences list.
  parentSequenceId?: string | null;
  createdAt: string;
  updatedAt: string;
  // Present on list responses only (GET /sequences) — computed server-side.
  stepCount?: number;
  enrolledCount?: number;
  openCount?: number;
  hasActiveEnrollments?: boolean;
}

export interface SequenceStep {
  id: string;
  sequenceId: string;
  order: number;
  type: StepType;
  // A send_email step can link several templates — the runner picks one
  // uniformly at random per send (true A/B).
  templateIds: string[];
  delayValue: number | null;
  delayUnit: DelayUnit | null;
  // Send this step as a reply in the enrollment's existing thread.
  threadedReply: boolean;
}

export function listSequences() {
  return apiGet<Sequence[]>('/sequences');
}

export function getSequence(id: string) {
  return apiGet<Sequence>(`/sequences/${id}`);
}

export function createSequence(input: {
  name: string;
  description?: string;
  senderAccountId?: string;
  senderAccountIds?: string[];
  fromName?: string;
  replyTo?: string;
}) {
  return apiPost<Sequence>('/sequences', input);
}

export function updateSequence(
  id: string,
  input: Partial<{
    name: string;
    description: string;
    isActive: boolean;
    senderAccountId: string | null;
    senderAccountIds: string[];
    fromName: string | null;
    replyTo: string | null;
  }>,
) {
  return apiPatch<Sequence>(`/sequences/${id}`, input);
}

export function listSteps(sequenceId: string) {
  return apiGet<SequenceStep[]>(`/sequences/${sequenceId}/steps`);
}

export function addStep(
  sequenceId: string,
  input: {
    type: StepType;
    templateIds?: string[];
    delayValue?: number;
    delayUnit?: DelayUnit;
    threadedReply?: boolean;
  },
) {
  return apiPost<SequenceStep>(`/sequences/${sequenceId}/steps`, input);
}

export function updateStep(
  sequenceId: string,
  stepId: string,
  input: Partial<{
    type: StepType;
    templateIds: string[];
    delayValue: number;
    delayUnit: DelayUnit;
    threadedReply: boolean;
  }>,
) {
  return apiPatch<SequenceStep>(`/sequences/${sequenceId}/steps/${stepId}`, input);
}

export function removeStep(sequenceId: string, stepId: string) {
  return apiDelete<{ id: string }>(`/sequences/${sequenceId}/steps/${stepId}`);
}

export function reorderSteps(sequenceId: string, stepIds: string[]) {
  return apiPost<SequenceStep[]>(`/sequences/${sequenceId}/steps/reorder`, { stepIds });
}

export interface SequenceStats {
  enrolled: { active: number; paused: number; stopped: number; completed: number; total: number };
  stepBreakdown: Array<{ stepId: string; stepNumber: number; templateIds: string[]; contactCount: number }>;
  sends: {
    sentToday: number;
    sentYesterday: number;
    scheduledTomorrow: number;
    totalSent: number;
    bounced: number;
    complained: number;
    failed: number;
  };
  engagement: { opens: number; clicks: number; openRate: number; clickRate: number };
  pipeline?: { dealValue: number; positiveThreads: number; total: number };
}

export function getSequenceStats(sequenceId: string) {
  return apiGet<SequenceStats>(`/sequences/${sequenceId}/stats`);
}

export interface SequenceSettings {
  sequenceId: string;
  stopOnReply: boolean;
  trackOpen: boolean;
  trackClick: boolean;
  stripStyling: boolean;
  textOnlyMode: 'off' | 'first_only' | 'all';
  triggerOnce: boolean;
  priority: 'followups' | 'new' | 'balanced' | 'aggressive';
  dailyCap: number | null;
  enrollPerDay: number | null;
  scheduleId: string | null;
  dealValue: number;
  verifyBeforeSend: boolean;
  cc: string | null;
  bcc: string | null;
  unsubFooter: boolean;
  unsubFormat: 'text' | 'link';
  unsubMessage: string | null;
  unsubHeader: boolean;
  unsubOnReply: boolean;
  unsubKeywords: string;
}

export function getSequenceSettings(id: string) {
  return apiGet<SequenceSettings>(`/sequences/${id}/settings`);
}

export function updateSequenceSettings(id: string, input: Partial<SequenceSettings>) {
  return apiPatch<SequenceSettings>(`/sequences/${id}/settings`, input);
}

export interface SendingSchedule {
  id: string;
  name: string;
  timezone: string;
  days: boolean[];
  startMin: number;
  endMin: number;
}

export function listSchedules() {
  return apiGet<SendingSchedule[]>('/sequences/schedules/all');
}

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Human label distinguishing schedules in a dropdown (name + window). */
export function scheduleLabel(s: SendingSchedule): string {
  const days = s.days.map((on, i) => (on ? DAY_SHORT[i] : null)).filter(Boolean).join(', ');
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return `${s.name} · ${days || 'No days'} ${fmt(s.startMin)}–${fmt(s.endMin)}`;
}

export function createSchedule(input: { name: string; timezone?: string; days?: boolean[]; startMin?: number; endMin?: number }) {
  return apiPost<SendingSchedule>('/sequences/schedules/all', input);
}

export function updateSchedule(
  id: string,
  input: Partial<{ name: string; timezone: string; days: boolean[]; startMin: number; endMin: number }>,
) {
  return apiPatch<SendingSchedule>(`/sequences/schedules/${id}`, input);
}

export interface Subsequence {
  id: string;
  parentSequenceId: string;
  name: string;
  conditions: ConditionTree;
  childSequenceId: string;
  delayMs: string;
  stopParent: boolean;
  // Present on list responses — the branch sequence's name + schedule.
  childName?: string;
  scheduleId?: string | null;
}

export function listSubsequences(sequenceId: string) {
  return apiGet<Subsequence[]>(`/sequences/${sequenceId}/subsequences`);
}

export interface SubsequenceInput {
  name: string;
  conditions: ConditionTree;
  delayMs?: string;
  stopParent?: boolean;
  scheduleId?: string | null;
}

export function createSubsequence(sequenceId: string, input: SubsequenceInput) {
  return apiPost<Subsequence>(`/sequences/${sequenceId}/subsequences`, input);
}

export function updateSubsequence(
  sequenceId: string,
  subId: string,
  input: Partial<SubsequenceInput>,
) {
  return apiPatch<Subsequence>(`/sequences/${sequenceId}/subsequences/${subId}`, input);
}

export function removeSubsequence(sequenceId: string, subId: string) {
  return apiDelete<{ id: string }>(`/sequences/${sequenceId}/subsequences/${subId}`);
}
