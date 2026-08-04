import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportStatus } from '../../common/enums/report.enums';

const RESOLVABLE_STATUSES = [
  ReportStatus.Violation_Confirmed,
  ReportStatus.Report_Dismissed,
] as const;

export class ResolveReportDto {
  @IsEnum(RESOLVABLE_STATUSES)
  status: (typeof RESOLVABLE_STATUSES)[number];

  @IsOptional()
  @IsString()
  resolution_note?: string;
}
