import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { RespondAppointmentDto } from './dto/respond-appointment.dto';

@Injectable()
export class AppointmentCardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
  ) {}

  /** รายการนัดหมายทั้งหมดของธุรกรรมที่ user เป็นคู่กรณี (ผู้ซื้อหรือผู้ขาย) */
  async findAllForUser(userId: number) {
    return this.prisma.appointmentCard.findMany({
      where: {
        transaction: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** นัดหมายเดียว — เช็คสิทธิ์ว่า user เป็นคู่กรณีของธุรกรรมนี้จริง */
  async findOneForUser(appointmentId: number, userId: number) {
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

    return appointment;
  }

  async respondToAppointment(
    appointmentId: number,
    respondAppointmentDto: RespondAppointmentDto,
    userId: number,
  ) {
    const appointment = await this.findOneForUser(appointmentId, userId);
    const { transaction } = appointment;

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
      data: { status: newStatus },
    });
  }

  /**
   * QR ของนัดหมายไม่ได้เก็บ token แยกของตัวเอง — ใช้ระบบ QR ของ Transaction
   * โดยตรง (§8.6) เพราะเป็น QR ตัวเดียวกันที่ยืนยันการรับสินค้าตอนเจอกันจริง
   * ฟังก์ชันนี้เป็นแค่ convenience proxy: เช็คสิทธิ์ผ่าน appointment card
   * แล้วส่งต่อไป TransactionService.generateQr() ตัวจริง
   */
  async generateQr(appointmentId: number, userId: number) {
    const appointment = await this.findOneForUser(appointmentId, userId);
    return this.transactionService.generateQr(appointment.transactionId, userId);
  }
}
