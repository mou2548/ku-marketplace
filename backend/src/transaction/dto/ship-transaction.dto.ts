import {
  IsDateString,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class ShipTransactionDto {
  // Column is VARCHAR(100). Free text — the courier's tracking code.
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tracking_number: string;

  // Stored in a DATE column, so a plain "YYYY-MM-DD" is what belongs here.
  @IsDateString()
  estimated_delivery_date: string;
}
