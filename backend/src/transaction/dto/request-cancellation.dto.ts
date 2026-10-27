import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RequestCancellationDto {
  // Stored in Transaction_Cancellation.reason (VARCHAR(500)). Required
  // because it is the main evidence an admin has if the other party rejects
  // and the dispute goes to review (§8.7).
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
