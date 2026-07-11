import { IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class CreateWebhookEndpointDto {
  @IsString()
  name!: string;

  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  slug!: string;

  @IsOptional()
  @IsObject()
  fieldMapping?: Record<string, string>;
}
