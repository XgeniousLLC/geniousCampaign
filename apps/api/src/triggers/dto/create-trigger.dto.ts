import { IsBoolean, IsObject, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

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

  @ValidateIf((dto: CreateTriggerDto) => dto.eventType === 'schedule')
  @IsString()
  scheduleCron?: string;

  @ValidateIf((dto: CreateTriggerDto) => dto.eventType === 'schedule')
  @IsString()
  scheduleTimezone?: string;
}
