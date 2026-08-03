import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RespondAppointmentDto } from './dto/respond-appointment.dto';

@Injectable()
export class AppointmentCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async respondToAppointment(
    appointmentId: number,
    respondAppointmentDto: RespondAppointmentDto,
  ) {
    const appointment = await this.prisma.appointmentCard.findUnique({
      where: { appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment card with ID ${appointmentId} not found`,
      );
    }

    const statusMap = {
      confirm: 'Confirmed',
      reject: 'Rejected',
      cancel: 'Cancelled',
    };

    return this.prisma.appointmentCard.update({
      where: { appointmentId },
      data: {
        status: statusMap[respondAppointmentDto.response],
      },
    });
  }
}