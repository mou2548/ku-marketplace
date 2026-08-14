import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateAppealDto {
  @IsInt()
  @IsPositive()
  report_id: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence_urls?: string[];
}
