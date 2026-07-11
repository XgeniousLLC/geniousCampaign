import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsObject()
  bodyJson!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  folder?: string;
}
