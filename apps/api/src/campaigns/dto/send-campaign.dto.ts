import { IsBoolean, IsOptional } from 'class-validator';

export class SendCampaignDto {
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}
