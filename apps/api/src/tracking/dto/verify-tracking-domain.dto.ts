import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyTrackingDomainDto {
  @IsString()
  @IsNotEmpty()
  domain!: string;
}
