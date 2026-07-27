import { IsUUID } from 'class-validator';

export class RemoveFromListDto {
  @IsUUID()
  listId!: string;
}
