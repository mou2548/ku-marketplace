import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AppointmentCardsService } from './appointment-cards.service';
import { RespondAppointmentDto } from './dto/respond-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';

@Controller('appointment-cards')
@UseGuards(JwtAuthGuard)
export class AppointmentCardsController {
  constructor(
    private readonly appointmentCardsService: AppointmentCardsService,
  ) {}

  @Post(':id/respond')
  respondToAppointment(
    @Param('id', ParseIntPipe) appointmentId: number,
    @Body() respondAppointmentDto: RespondAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentCardsService.respondToAppointment(
      appointmentId,
      respondAppointmentDto,
      user.userId,
    );
  }
}
