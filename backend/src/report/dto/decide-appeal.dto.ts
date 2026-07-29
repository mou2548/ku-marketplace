import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AppealStatus } from '../../../generated/prisma/client';

const DECIDABLE_STATUSES = [
  AppealStatus.Approved,
  AppealStatus.Rejected,
] as const;

export class DecideAppealDto {
  @IsEnum(DECIDABLE_STATUSES)
  status: (typeof DECIDABLE_STATUSES)[number];

  @IsOptional()
  @IsString()
  resolution_note?: string;
}
