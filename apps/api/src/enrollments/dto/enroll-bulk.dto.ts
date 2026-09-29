import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class EnrollBulkDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  contactIds?: string[];

  @IsOptional()
  @IsUUID()
  listId?: string;

  @IsOptional()
  @IsUUID()
  tagId?: string;
}
