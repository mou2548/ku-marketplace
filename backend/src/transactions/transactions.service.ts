import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Only the buyer and the seller may read or write inside a transaction —
   * everything under /transactions/:id goes through here first.
   */
  private async assertParticipant(transactionId: number, userId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction with ID ${transactionId} not found`,
      );
    }

    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new ForbiddenException('You are not part of this transaction');
    }

    return transaction;
  }

  private async getOrCreateChatRoom(transactionId: number, userId: number) {
    await this.assertParticipant(transactionId, userId);

    let room = await this.prisma.chatRoom.findFirst({
      where: { transactionId },
    });

    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: { transactionId },
      });
    }

    return room;
  }

  async getChatHistory(transactionId: number, userId: number) {
    const room = await this.getOrCreateChatRoom(transactionId, userId);

    return this.prisma.chatMessage.findMany({
      where: { roomId: room.roomId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(
    transactionId: number,
    createMessageDto: CreateMessageDto,
    userId: number,
  ) {
    const { content, image_urls } = createMessageDto;

    if (!content && (!image_urls || image_urls.length === 0)) {
      throw new BadRequestException(
        'Message must contain at least "content" or "image_urls"',
      );
    }

    const room = await this.getOrCreateChatRoom(transactionId, userId);

    return this.prisma.chatMessage.create({
      data: {
        roomId: room.roomId,
        senderId: userId,
        content: content || null,
        imageUrls: image_urls ?? undefined,
      },
    });
  }

  async createAppointment(
    transactionId: number,
    createAppointmentDto: CreateAppointmentDto,
    userId: number,
  ) {
    await this.assertParticipant(transactionId, userId);

    const { date, time, location } = createAppointmentDto;

    return this.prisma.appointmentCard.create({
      data: {
        transactionId,
        proposedBy: userId,
        date: new Date(date),
        time: new Date(`${date}T${time}:00Z`),
        location,
        status: 'Pending',
      },
    });
  }

  /** §appointment-cards GET — เดิมมีแค่ POST เส้นนี้ ดูรายการนัดหมายต้องไปทาง
   * GET /appointment-cards แยกต่างหาก (กรองเอาเองฝั่ง client) ตอนนี้เพิ่ม GET ตรงนี้
   * ให้ scope ตาม transaction เดียวเลย เข้าถึงได้เฉพาะคู่กรณี (ใช้ guard เดียวกับ
   * ที่เหลือใน controller นี้ทั้งหมด) */
  async getAppointmentCards(transactionId: number, userId: number) {
    await this.assertParticipant(transactionId, userId);

    return this.prisma.appointmentCard.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
