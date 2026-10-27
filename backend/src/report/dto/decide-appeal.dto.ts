import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AppealStatus } from '../../common/enums/report.enums';

const DECIDABLE_STATUSES = [
  AppealStatus.Approved,
  AppealStatus.Rejected,
] as const;

export class DecideAppealDto {
  @IsEnum(DECIDABLE_STATUSES)
  status: (typeof DECIDABLE_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolution_note?: string;
}
