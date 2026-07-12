import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  name!: string;

  @IsUUID()
  templateId!: string;

  @IsUUID()
  listId!: string;

  @IsOptional()
  @IsBoolean()
  isDryRun?: boolean;

  @IsOptional()
  @IsEmail()
  sendToEmail?: string;
}
