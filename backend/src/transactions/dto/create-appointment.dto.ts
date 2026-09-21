import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  date: string; // Format: "YYYY-MM-DD"

  @IsString()
  @IsNotEmpty()
  time: string; // Format: "HH:mm"

  @IsString()
  @IsNotEmpty()
  location: string;
}
