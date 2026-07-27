import { IsArray, IsUUID } from 'class-validator';

export class RemoveTagsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds!: string[];
}
