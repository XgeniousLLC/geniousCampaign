import { IsIn, IsInt, IsOptional, IsUUID } from 'class-validator';

export const STEP_TYPES = ['send_email', 'wait', 'condition', 'exit'] as const;
export const DELAY_UNITS = ['minutes', 'hours', 'days'] as const;

export class CreateStepDto {
  @IsIn(STEP_TYPES)
  type!: (typeof STEP_TYPES)[number];

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsInt()
  delayValue?: number;

  @IsOptional()
  @IsIn(DELAY_UNITS)
  delayUnit?: (typeof DELAY_UNITS)[number];
}
