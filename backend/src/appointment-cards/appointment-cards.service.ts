import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { RespondAppointmentDto } from './dto/respond-appointment.dto';
import { displayName } from '../common/utils/display-name';

@Injectable()
export class AppointmentCardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
  ) {}

  private serializeUserSummary(user: {
    userId: number;
    firstNameEn: string;
    lastNameEn: string;
    firstNameTh?: string | null;
    lastNameTh?: string | null;
    emailVerifiedAt: Date | null;
    avatarUrl?: string | null;
  }) {
    return {
      user_id: user.userId,
      name: displayName(user),
      isVerified: user.emailVerifiedAt !== null,
      avatar_url: user.avatarUrl ?? null,
    };
  }

  private serializeAppointment(appointment: {
    appointmentId: number;
    transactionId: number;
    proposedBy: number;
    date: Date;
    time: Date;
    location: string;
    status: string | null;
    deletedAt: Date | null;
    createdAt: Date | null;
    proposer: {
      userId: number;
      firstNameEn: string;
      lastNameEn: string;
      emailVerifiedAt: Date | null;
    };
  }) {
    return {
      appointment_id: appointment.appointmentId,
      transaction_id: appointment.transactionId,
      proposed_by: appointment.proposedBy,
      proposer: this.serializeUserSummary(appointment.proposer),
      date: appointment.date,
      time: appointment.time,
      location: appointment.location,
      status: appointment.status,
      // §appointment loop fix — a retired card (superseded or rejected) is no
      // longer the current appointment. The frontend derives "current" as the
      // newest card with deleted_at null, mirroring assertHandoverReady.
      deleted_at: appointment.deletedAt,
      created_at: appointment.createdAt,
    };
  }

  /** รายการนัดหมายทั้งหมดของธุรกรรมที่ user เป็นคู่กรณี (ผู้ซื้อหรือผู้ขาย) */
  async findAllForUser(userId: number) {
    const appointments = await this.prisma.appointmentCard.findMany({
      where: {
        transaction: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
        },
      },
      include: { proposer: true },
      orderBy: { createdAt: 'desc' },
    });
    return appointments.map((appointment) =>
      this.serializeAppointment(appointment),
    );
  }

  /** นัดหมายเดียว — เช็คสิทธิ์ว่า user เป็นคู่กรณีของธุรกรรมนี้จริง */
  async findOneForUser(appointmentId: number, userId: number) {
    const appointment = await this.prisma.appointmentCard.findUnique({
      where: { appointmentId },
      include: { transaction: true, proposer: true },
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
    const original = await this.findOneForUser(appointmentId, userId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "transaction_id" FROM "Transaction" WHERE "transaction_id" = ${original.transactionId} FOR UPDATE`;
      const appointment = await tx.appointmentCard.findUniqueOrThrow({
        where: { appointmentId },
        include: { transaction: true },
      });
      const latest = await tx.appointmentCard.findFirst({
        where: { transactionId: appointment.transactionId, deletedAt: null },
        orderBy: [{ createdAt: 'desc' }, { appointmentId: 'desc' }],
      });
      if (appointment.proposedBy === userId)
        throw new BadRequestException(
          'The proposer cannot respond to their own appointment',
        );
      if (
        appointment.status !== 'Pending' ||
        latest?.appointmentId !== appointmentId
      )
        throw new BadRequestException(
          'This appointment is already answered or superseded',
        );
      const transaction = appointment.transaction;
      const returning =
        transaction.status === 'Pending Refund' &&
        transaction.itemReceivedConfirmedByBuyerAt &&
        !transaction.itemReturnConfirmedAt;
      if (
        !returning &&
        (!['Pending', 'Processing'].includes(transaction.status ?? '') ||
          transaction.cancellationResponse === 'Pending' ||
          transaction.activeReportId)
      )
        throw new BadRequestException(
          'This transaction cannot arrange a handover now',
        );
      const status =
        respondAppointmentDto.response === 'confirm'
          ? 'Confirmed'
          : respondAppointmentDto.response === 'reject'
            ? 'Rejected'
            : null;
      if (!status)
        throw new BadRequestException('Invalid appointment response');
      const updated = await tx.appointmentCard.update({
        where: { appointmentId },
        // §appointment loop fix — declining ("Another time") retires this card
        // too, so the current appointment falls to nothing and the deal goes
        // back to proposing a time, never back to an older Confirmed card.
        data: {
          status,
          ...(status === 'Rejected' ? { deletedAt: new Date() } : {}),
        },
        include: { proposer: true },
      });
      await tx.notification.create({
        data: {
          userId: appointment.proposedBy,
          eventKey: `appointment:${appointmentId}:responded`,
          title:
            status === 'Confirmed' ? 'Meetup confirmed' : 'Meetup declined',
          body: `${appointment.date.toISOString().slice(0, 10)} at ${appointment.time.toISOString().slice(11, 16)}, ${appointment.location}.`,
          href: `/history/${appointment.transactionId}`,
        },
      });
      return this.serializeAppointment(updated);
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
    return this.transactionService.generateQr(
      appointment.transactionId,
      userId,
    );
  }
}
