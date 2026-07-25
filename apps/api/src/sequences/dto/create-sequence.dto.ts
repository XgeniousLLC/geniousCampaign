import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSequenceDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Global sender for every send_email step in this sequence — null = auto-pick.
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
