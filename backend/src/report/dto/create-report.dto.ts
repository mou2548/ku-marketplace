import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReportType } from '../../common/enums/report.enums';
import { MAX_EVIDENCE_MESSAGES, MAX_EVIDENCE_PHOTOS } from '../report-evidence';

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

  /** Uploaded photos (`POST /uploads/image`). Real URLs only: the stored
   * `chat-message:` entries cannot be sent from here. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EVIDENCE_PHOTOS)
  @IsUrl(
    { protocols: ['https', 'http'], require_protocol: true },
    { each: true },
  )
  evidence_urls?: string[];

  /** Chat messages the reporter picked out, checked by `assertMessagesBelong`. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EVIDENCE_MESSAGES)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  evidence_message_ids?: number[];
}
