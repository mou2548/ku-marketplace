import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

    const statusMap: Record<string, string> = {
      confirm: 'Confirmed',
      reject: 'Rejected',
    };

    const newStatus = statusMap[respondAppointmentDto.response];

    if (!newStatus) {
      throw new BadRequestException(
        `Invalid response: ${respondAppointmentDto.response}. Response must be 'confirm' or 'reject'.`,
      );
    }

    return this.prisma.appointmentCard.update({
      where: { appointmentId },
      data: {
        status: newStatus,
      },
    });
  }
}