import { ArrayNotEmpty, IsUUID } from 'class-validator';

export class ReorderStepsDto {
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  stepIds!: string[];
}
