import { ArrayNotEmpty, IsArray, IsString, IsUrl } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  name!: string;

  @IsUrl({ require_tld: false })
  url!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  eventTypes!: string[];
}
