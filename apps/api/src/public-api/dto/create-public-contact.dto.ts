import { IsArray, IsEmail, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePublicContactDto {
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

  // Added on top of the API key's own defaultListId, if it has one.
  @IsOptional()
  @IsUUID()
  listId?: string;

  // Added on top of the API key's own defaultTagIds, if it has any.
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}
