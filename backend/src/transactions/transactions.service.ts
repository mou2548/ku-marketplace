import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

/** §6.2 — รูปในแชทมีอายุการแสดงผล 7 วัน ก่อนถูกแทนที่ด้วยข้อความแจ้งเตือน */
const IMAGE_DISPLAY_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeUserSummary(user: {
    userId: number;
    firstNameEn: string;
    lastNameEn: string;
    emailVerifiedAt: Date | null;
  }) {
    return {
      user_id: user.userId,
      name: `${user.firstNameEn} ${user.lastNameEn}`.trim(),
      isVerified: user.emailVerifiedAt !== null,
    };
  }

  /**
   * §6.2 — รูปหมดอายุการแสดงผลแค่ตอน "แสดงผล" เท่านั้น แถวในฐานข้อมูลและไฟล์บน
   * Cloudinary ไม่ได้ถูกลบจริง (ไม่มีคอลัมน์ไหนบันทึกว่าลบไปแล้วหรือยัง) — คำนวณ
   * จาก created_at ทุกครั้งที่อ่าน ถ้าเกิน 7 วันให้ซ่อน image_urls แล้วส่ง
   * images_expired: true แทน ดู frontend/docs/design/api-gaps.md สำหรับข้อจำกัดนี้
   */
  private serializeMessage(message: {
    messageId: number;
    roomId: number;
    senderId: number;
    content: string | null;
    imageUrls: unknown;
    createdAt: Date | null;
    sender: {
      userId: number;
      firstNameEn: string;
      lastNameEn: string;
      emailVerifiedAt: Date | null;
    };
  }) {
    const createdAt = message.createdAt ?? new Date();
    const expired = Date.now() - createdAt.getTime() > IMAGE_DISPLAY_LIFETIME_MS;
    const hasImages = Array.isArray(message.imageUrls) && message.imageUrls.length > 0;

    return {
      message_id: message.messageId,
      room_id: message.roomId,
      sender_id: message.senderId,
      sender: this.serializeUserSummary(message.sender),
      content: message.content,
      image_urls: hasImages && !expired ? (message.imageUrls as string[]) : null,
      images_expired: hasImages && expired,
      created_at: message.createdAt,
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
      created_at: appointment.createdAt,
    };
  }

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

  /**
   * Wrapped in `{ room_id, messages }` rather than a bare array — a brand-new
   * room with zero messages still has to tell the caller its `room_id`
   * (the room is lazily created above), which a `[]` cannot carry.
   */
  async getChatHistory(transactionId: number, userId: number) {
    const room = await this.getOrCreateChatRoom(transactionId, userId);

    const messages = await this.prisma.chatMessage.findMany({
      where: { roomId: room.roomId },
      include: { sender: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      room_id: room.roomId,
      messages: messages.map((message) => this.serializeMessage(message)),
    };
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

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId: room.roomId,
        senderId: userId,
        content: content || null,
        imageUrls: image_urls ?? undefined,
      },
      include: { sender: true },
    });
    return this.serializeMessage(message);
  }

  async createAppointment(
    transactionId: number,
    createAppointmentDto: CreateAppointmentDto,
    userId: number,
  ) {
    const transaction = await this.assertParticipant(transactionId, userId);

    // §6.3 — การ์ดนัดหมายมีไว้สำหรับธุรกรรมที่เลือกนัดรับด้วยตนเอง (Meetup) เท่านั้น
    if (transaction.deliveryMethod !== 'Meetup') {
      throw new BadRequestException(
        'การ์ดนัดหมายใช้ได้เฉพาะธุรกรรมที่เลือกนัดรับด้วยตนเองเท่านั้น',
      );
    }

    const { date, time, location } = createAppointmentDto;

    const appointment = await this.prisma.appointmentCard.create({
      data: {
        transactionId,
        proposedBy: userId,
        date: new Date(date),
        time: new Date(`${date}T${time}:00Z`),
        location,
        status: 'Pending',
      },
      include: { proposer: true },
    });
    return this.serializeAppointment(appointment);
  }

  /** §appointment-cards GET — เดิมมีแค่ POST เส้นนี้ ดูรายการนัดหมายต้องไปทาง
   * GET /appointment-cards แยกต่างหาก (กรองเอาเองฝั่ง client) ตอนนี้เพิ่ม GET ตรงนี้
   * ให้ scope ตาม transaction เดียวเลย เข้าถึงได้เฉพาะคู่กรณี (ใช้ guard เดียวกับ
   * ที่เหลือใน controller นี้ทั้งหมด)
   *
   * ไม่มีคอลัมน์ "pinned" ในฐานข้อมูล — การ์ดที่ถูกปักไว้ (§6.3) เป็นแค่การ์ด
   * `Confirmed` ล่าสุด derive เอาฝั่ง frontend จากลิสต์นี้ (ดู
   * `deriveAppointmentView` ใน `lib/api/chat.ts`) ไม่ได้ส่ง flag แยกมาจากที่นี่
   */
  async getAppointmentCards(transactionId: number, userId: number) {
    await this.assertParticipant(transactionId, userId);

    const appointments = await this.prisma.appointmentCard.findMany({
      where: { transactionId },
      include: { proposer: true },
      orderBy: { createdAt: 'desc' },
    });
    return appointments.map((appointment) => this.serializeAppointment(appointment));
  }
}
