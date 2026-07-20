import { IsArray, IsUUID } from 'class-validator';

export class BulkDeleteTemplatesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}
