import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAppealDto {
  @IsInt()
  @IsPositive()
  report_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence_urls?: string[];
}
