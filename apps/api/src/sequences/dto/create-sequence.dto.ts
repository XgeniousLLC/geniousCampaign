import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMaxSize,
} from 'class-validator';

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

  // Multi-sender set: step 1 rotates across these (most headroom wins) and
  // the winner sticks for the enrollment's later steps. Empty/omitted =
  // legacy single sender / global auto-pick.
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(10)
  senderAccountIds?: string[];

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsEmail()
  replyTo?: string;
}
