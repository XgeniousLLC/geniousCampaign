import { IsEmail, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export const CONTACT_STATUSES = ['active', 'unsubscribed', 'bounced', 'suppressed'] as const;

export class CreateContactDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @IsOptional()
  @IsIn(CONTACT_STATUSES)
  status?: (typeof CONTACT_STATUSES)[number];
}
