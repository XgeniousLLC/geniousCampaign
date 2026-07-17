import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  name!: string;

  // Omit/null = never expires. Frontend defaults this to +1 year and warns
  // when the user explicitly clears it.
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
