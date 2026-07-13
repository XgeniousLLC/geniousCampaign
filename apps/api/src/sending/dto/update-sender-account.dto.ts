import { IsBoolean, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

// Shared PATCH shape for both providers — Gmail accounts just never send
// the aws*/ses* fields, harmless since the service only touches whichever
// fields are actually present.
export class UpdateSenderAccountDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  dailySendLimit?: number;

  @IsOptional()
  @IsString()
  awsRegion?: string;

  @IsOptional()
  @IsString()
  awsAccessKeyId?: string;

  @IsOptional()
  @IsString()
  awsSecretAccessKey?: string;

  @IsOptional()
  @IsString()
  sesConfigurationSet?: string;
}
