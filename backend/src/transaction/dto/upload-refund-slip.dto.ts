import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UploadRefundSlipDto {
  // Evidence only — proof the seller sent the money back off-platform.
  // Column is VARCHAR(500).
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  refund_slip_url: string;
}
