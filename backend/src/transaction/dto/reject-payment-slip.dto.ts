import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectPaymentSlipDto {
  // Stored in Transaction_Payment.rejection_reason (VARCHAR(500)) and shown to
  // the buyer. The seller checks their own bank app; this says what they found
  // (no money arrived, the amount differs, the slip looks forged).
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
