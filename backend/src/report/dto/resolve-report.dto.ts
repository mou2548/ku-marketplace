import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportStatus, Sanction } from '../../common/enums/report.enums';

const RESOLVABLE_STATUSES = [
  ReportStatus.Violation_Confirmed,
  ReportStatus.Report_Dismissed,
] as const;

export class ResolveReportDto {
  @IsEnum(RESOLVABLE_STATUSES)
  status: (typeof RESOLVABLE_STATUSES)[number];

  /** §7.1 — only meaningful when `status` is `Violation_Confirmed`; ignored
   * (treated as `none`) otherwise. Optional so older/manual calls without it
   * still work. */
  @IsOptional()
  @IsEnum(Sanction)
  sanction?: Sanction;

  @IsOptional()
  @IsString()
  resolution_note?: string;
}
