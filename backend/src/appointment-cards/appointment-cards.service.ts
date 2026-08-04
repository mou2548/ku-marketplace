import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RespondAppointmentDto } from './dto/respond-appointment.dto';

@Injectable()
export class AppointmentCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async respondToAppointment(
    appointmentId: number,
    respondAppointmentDto: RespondAppointmentDto,
    userId: number,
  ) {
    const appointment = await this.prisma.appointmentCard.findUnique({
      where: { appointmentId },
      include: { transaction: true },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment card with ID ${appointmentId} not found`,
      );
    }

    const { transaction } = appointment;
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new ForbiddenException('You are not part of this transaction');
    }

    // The card is an offer to the other side — the proposer answering their own
    // proposal would confirm a meeting nobody agreed to.
    if (appointment.proposedBy === userId) {
      throw new BadRequestException(
        'The user who proposed this appointment cannot respond to it',
      );
    }

    if (appointment.status !== 'Pending') {
      throw new BadRequestException(
        `Appointment ${appointmentId} has already been answered (status: ${appointment.status})`,
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
