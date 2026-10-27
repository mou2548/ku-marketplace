import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReportType } from '../../common/enums/report.enums';

export class CreateReportDto {
  @IsEnum(ReportType)
  report_type: ReportType;

  @IsInt()
  @IsPositive()
  target_id: number;

  @IsString()
  @MaxLength(100)
  reason_category: string;

  /**
   * Required, at least 10 characters once trimmed: an admin cannot decide a
   * report from a bare category. The pipe runs with `transform: true`, so the
   * service receives the trimmed text.
   */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10, { message: 'details must be at least 10 characters' })
  @MaxLength(2000)
  details: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence_urls?: string[];
}
