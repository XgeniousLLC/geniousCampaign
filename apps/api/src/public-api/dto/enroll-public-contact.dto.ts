import { IsUUID } from 'class-validator';

export class EnrollPublicContactDto {
  @IsUUID()
  sequenceId!: string;
}
