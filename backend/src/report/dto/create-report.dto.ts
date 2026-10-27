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

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;

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
