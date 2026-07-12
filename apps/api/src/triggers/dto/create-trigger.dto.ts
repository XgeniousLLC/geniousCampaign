import { IsBoolean, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTriggerDto {
  @IsString()
  name!: string;

  @IsString()
  eventType!: string;

  @IsObject()
  conditions!: Record<string, unknown>;

  @IsUUID()
  sequenceId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
