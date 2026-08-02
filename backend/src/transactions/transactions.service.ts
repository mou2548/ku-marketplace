import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper to ensure a Chat_Room exists for a given transaction_id
  private async getOrCreateChatRoom(transactionId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transaction_id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
    }

    let room = await this.prisma.chat_Room.findFirst({
      where: { transaction_id: transactionId },
    });

    if (!room) {
      room = await this.prisma.chat_Room.create({
        data: { transaction_id: transactionId },
      });
    }

    return room;
  }

  // 1. GET /transactions/:id/message
  async getChatHistory(transactionId: number) {
    const room = await this.getOrCreateChatRoom(transactionId);

    return this.prisma.chat_Message.findMany({
      where: { room_id: room.room_id },
      orderBy: { created_at: 'asc' },
    });
  }

// 2. POST /transactions/:id/message
async sendMessage(transactionId: number, createMessageDto: CreateMessageDto) {
  const { content, image_urls } = createMessageDto;
  if (!content && (!image_urls || image_urls.length === 0)) {
    throw new BadRequestException(
      'Message must contain at least "content" or "image_urls"',
    );
  }
  const room = await this.getOrCreateChatRoom(transactionId);

  return this.prisma.chat_Message.create({
    data: {
      room_id: room.room_id,
      sender_id: 1, // Defaulting to mock user_id 1
      content: createMessageDto.content || null,
      image_urls: createMessageDto.image_urls ?? undefined,
    },
  });
}

  // 3. POST /transactions/:id/appointment-cards
  async createAppointment(
    transactionId: number,
    createAppointmentDto: CreateAppointmentDto,
  ) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transaction_id: transactionId },
    });
  
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
    }
  
    const { date, time, location } = createAppointmentDto;
  
    // Combine ISO date and HH:mm time string into a Date object
    const appointmentTime = new Date(`${date}T${time}:00Z`);
  
    return this.prisma.appointment_Card.create({
      data: {
        transaction_id: transactionId,
        proposed_by: 1,
        date: new Date(date),
        time: appointmentTime,
        location,
        status: 'Pending',
      },
    });
  }
}