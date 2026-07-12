import { IsUUID } from 'class-validator';

export class EnrollActionDto {
  @IsUUID()
  contactId!: string;
}
