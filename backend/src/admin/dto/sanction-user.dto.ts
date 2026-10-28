import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Sanction } from '../../common/enums/report.enums';

export const ADMIN_SANCTIONS = [
  Sanction.Suspend_Temporary,
  Sanction.Suspend_Permanent,
] as const;

export class SanctionUserDto {
  @IsIn(ADMIN_SANCTIONS)
  sanction: (typeof ADMIN_SANCTIONS)[number];

  /** Shown to the user in the sanction notification and on their appeal. */
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;
}

export class ReinstateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
