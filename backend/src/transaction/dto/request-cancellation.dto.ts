import { IsNotEmpty, IsString } from 'class-validator';

export class RequestCancellationDto {
  // Stored in Transaction.cancellation_reason (TEXT). Required because it is
  // the main evidence an admin has if the other party rejects and the dispute
  // goes to review (§8.7).
  @IsString()
  @IsNotEmpty()
  reason: string;
}
