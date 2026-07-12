import { IsUUID } from 'class-validator';

export class ManualSuppressDto {
  @IsUUID()
  contactId!: string;
}
