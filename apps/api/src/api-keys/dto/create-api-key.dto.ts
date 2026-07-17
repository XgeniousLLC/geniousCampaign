import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsUUID()
  defaultListId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  defaultTagIds?: string[];
}
