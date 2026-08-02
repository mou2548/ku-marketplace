import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RespondAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['confirm', 'reject', 'cancel'])
  response: 'confirm' | 'reject' | 'cancel';
}