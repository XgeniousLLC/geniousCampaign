import { IsArray, IsOptional, IsString } from 'class-validator';

// Extra app origins to allow besides the calling web app's own Origin
// header (which the endpoint picks up automatically). Each entry is
// validated as a bare https origin (http only for localhost) in R2Service.
export class ConfigureCorsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  origins?: string[];
}
