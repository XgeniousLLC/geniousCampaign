import { IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CAMPAIGN_AUDIENCE_TYPES } from './create-campaign.dto';

// Only ever applied to a still-'draft' campaign (CampaignsService.update())
// — once sending has started, none of this can change out from under it.
export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsIn(CAMPAIGN_AUDIENCE_TYPES)
  audienceType?: (typeof CAMPAIGN_AUDIENCE_TYPES)[number];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  listIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excludeListIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  contactIds?: string[];

  @IsOptional()
  @IsBoolean()
  isDryRun?: boolean;

  @IsOptional()
  @IsEmail()
  sendToEmail?: string;

  @IsOptional()
  @IsUUID()
  senderAccountId?: string;

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsEmail()
  replyTo?: string;
}
