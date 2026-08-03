import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateChatRoom(transactionId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction with ID ${transactionId} not found`,
      );
    }

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

  async getChatHistory(transactionId: number) {
    const room = await this.getOrCreateChatRoom(transactionId);

    return this.prisma.chatMessage.findMany({
      where: { roomId: room.roomId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(
    transactionId: number,
    createMessageDto: CreateMessageDto,
  ) {
    const { content, image_urls } = createMessageDto;

    if (!content && (!image_urls || image_urls.length === 0)) {
      throw new BadRequestException(
        'Message must contain at least "content" or "image_urls"',
      );
    }

    const room = await this.getOrCreateChatRoom(transactionId);

    return this.prisma.chatMessage.create({
      data: {
        roomId: room.roomId,
        senderId: 1,
        content: content || null,
        imageUrls: image_urls ?? undefined,
      },
    });
  }

  async createAppointment(
    transactionId: number,
    createAppointmentDto: CreateAppointmentDto,
  ) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction with ID ${transactionId} not found`,
      );
    }

    const { date, time, location } = createAppointmentDto;

    return this.prisma.appointmentCard.create({
      data: {
        transactionId,
        proposedBy: 1,
        date: new Date(date),
        time: new Date(`${date}T${time}:00Z`),
        location,
        status: 'Pending',
      },
    });
  }
}