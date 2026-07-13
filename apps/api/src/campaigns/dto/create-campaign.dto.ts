import { IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export const CAMPAIGN_AUDIENCE_TYPES = ['list', 'tags', 'contacts'] as const;

export class CreateCampaignDto {
  @IsString()
  name!: string;

  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsIn(CAMPAIGN_AUDIENCE_TYPES)
  audienceType?: (typeof CAMPAIGN_AUDIENCE_TYPES)[number];

  @IsOptional()
  @IsUUID()
  listId?: string;

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
}
