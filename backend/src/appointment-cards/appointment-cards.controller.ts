import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { AppointmentCardsService } from './appointment-cards.service';
import { RespondAppointmentDto } from './dto/respond-appointment.dto';

@Controller('appointment-cards')
export class AppointmentCardsController {
  constructor(
    private readonly appointmentCardsService: AppointmentCardsService,
  ) {}

  @Post(':id/respond')
  respondToAppointment(
    @Param('id', ParseIntPipe) appointmentId: number,
    @Body() respondAppointmentDto: RespondAppointmentDto,
  ) {
    return this.appointmentCardsService.respondToAppointment(
      appointmentId,
      respondAppointmentDto,
    );
  }
}