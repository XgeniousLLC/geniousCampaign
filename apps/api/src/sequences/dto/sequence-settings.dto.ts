import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class UpdateSequenceSettingsDto {
  @IsOptional() @IsBoolean() stopOnReply?: boolean;
  @IsOptional() @IsBoolean() trackOpen?: boolean;
  @IsOptional() @IsBoolean() trackClick?: boolean;
  @IsOptional() @IsBoolean() stripStyling?: boolean;
  @IsOptional() @IsIn(['off', 'first_only', 'all']) textOnlyMode?:
    'off' | 'first_only' | 'all';
  @IsOptional() @IsBoolean() triggerOnce?: boolean;
  @IsOptional()
  @IsIn(['followups', 'new', 'balanced', 'aggressive'])
  priority?: 'followups' | 'new' | 'balanced' | 'aggressive';
  @IsOptional() @IsInt() @Min(1) @Max(100000) dailyCap?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100000) enrollPerDay?: number;
  @IsOptional() @IsUUID() scheduleId?: string;
  @IsOptional() @IsInt() @Min(0) dealValue?: number;
  @IsOptional() @IsBoolean() verifyBeforeSend?: boolean;
  @IsOptional() @IsString() cc?: string;
  @IsOptional() @IsString() bcc?: string;
  @IsOptional() @IsBoolean() unsubFooter?: boolean;
  @IsOptional() @IsIn(['text', 'link']) unsubFormat?: 'text' | 'link';
  @IsOptional() @IsString() unsubMessage?: string;
  @IsOptional() @IsBoolean() unsubHeader?: boolean;
  @IsOptional() @IsBoolean() unsubOnReply?: boolean;
  @IsOptional() @IsString() unsubKeywords?: string;
}

export class CreateSendingScheduleDto {
  @IsString() name!: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsArray() @IsBoolean({ each: true }) days?: boolean[];
  @IsOptional() @IsInt() @Min(0) @Max(1439) startMin?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1440) endMin?: number;
}

export class UpdateSendingScheduleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsArray() @IsBoolean({ each: true }) days?: boolean[];
  @IsOptional() @IsInt() @Min(0) @Max(1439) startMin?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1440) endMin?: number;
}
