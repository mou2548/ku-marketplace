import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
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

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence_urls?: string[];
}
