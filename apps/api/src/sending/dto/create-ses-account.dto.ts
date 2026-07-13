import { IsEmail, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateSesAccountDto {
  @IsEmail()
  email!: string;

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
