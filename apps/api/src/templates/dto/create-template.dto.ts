import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

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

  @IsOptional()
  @IsUUID()
  parentTemplateId?: string;
}
