import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RespondAppointmentDto } from './dto/respond-appointment.dto';

@Injectable()
export class AppointmentCardsService {
  constructor(private readonly prisma: PrismaService) {}

  // 4. POST /appointment-cards/:id/respond
  async respondToAppointment(
    appointmentId: number,
    respondAppointmentDto: RespondAppointmentDto,
  ) {
    const appointment = await this.prisma.appointment_Card.findUnique({
      where: { appointment_id: appointmentId },
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

    return this.prisma.appointment_Card.update({
      where: { appointment_id: appointmentId },
      data: {
        status: statusMap[respondAppointmentDto.response],
      },
    });
  }
}