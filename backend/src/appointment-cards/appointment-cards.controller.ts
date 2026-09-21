import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AppointmentCardsService } from './appointment-cards.service';
import { RespondAppointmentDto } from './dto/respond-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';
import { ClassValidatorPipe } from '../common/pipes/class-validator.pipe';

@Controller('appointment-cards')
@UseGuards(JwtAuthGuard)
@UsePipes(ClassValidatorPipe)
export class AppointmentCardsController {
  constructor(
    private readonly appointmentCardsService: AppointmentCardsService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.appointmentCardsService.findAllForUser(user.userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentCardsService.findOneForUser(id, user.userId);
  }

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

  /** proxy ไปยัง TransactionService.generateQr() ตัวจริง — ดู comment ใน service */
  @Post(':id/qr/generate')
  @HttpCode(200)
  generateQr(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentCardsService.generateQr(id, user.userId);
  }
}
