import { IsBoolean, IsISO8601, IsOptional } from 'class-validator';

export class SendCampaignDto {
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;

  // GC-113 — an ISO instant in the future. When set, send() enqueues a
  // delayed BullMQ job instead of an immediate one; omitted means send now.
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}
