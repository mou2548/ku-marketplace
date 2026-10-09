import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { displayName } from '../common/utils/display-name';

/** §6.2 — รูปในแชทมีอายุการแสดงผล 7 วัน ก่อนถูกแทนที่ด้วยข้อความแจ้งเตือน */
const IMAGE_DISPLAY_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

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

  /**
   * §6.2 — รูปหมดอายุการแสดงผลแค่ตอน "แสดงผล" เท่านั้น แถวในฐานข้อมูลและไฟล์บน
   * Cloudinary ไม่ได้ถูกลบจริง (ไม่มีคอลัมน์ไหนบันทึกว่าลบไปแล้วหรือยัง) — คำนวณ
   * จาก created_at ทุกครั้งที่อ่าน ถ้าเกิน 7 วันให้ซ่อน image_urls แล้วส่ง
   * images_expired: true แทน ดู frontend/docs/design/api-gaps.md สำหรับข้อจำกัดนี้
   */
  private serializeMessage(
    message: {
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
    },
    // §7.1/§7.5.3 — an admin reviewing a report needs the real evidence, not
    // the 7-day display expiry meant for the two parties' own view of it.
    forAdmin = false,
  ) {
    const createdAt = message.createdAt ?? new Date();
    const expired =
      !forAdmin && Date.now() - createdAt.getTime() > IMAGE_DISPLAY_LIFETIME_MS;
    const hasImages =
      Array.isArray(message.imageUrls) && message.imageUrls.length > 0;

    return {
      message_id: message.messageId,
      room_id: message.roomId,
      sender_id: message.senderId,
      sender: this.serializeUserSummary(message.sender),
      content: message.content,
      image_urls:
        hasImages && !expired ? (message.imageUrls as string[]) : null,
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
      // §appointment loop fix — see appointment-cards.service.ts. NULL means
      // this is still a live card; a value means a newer proposal replaced it
      // or it was rejected.
      deleted_at: appointment.deletedAt,
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

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "transaction_id" FROM "Transaction" WHERE "transaction_id" = ${transactionId} FOR UPDATE`;
      const room = await tx.chatRoom.findFirst({
        where: { transactionId },
        orderBy: { roomId: 'asc' },
      });
      return room ?? tx.chatRoom.create({ data: { transactionId } });
    });
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
    await this.assertParticipant(transactionId, userId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "transaction_id" FROM "Transaction" WHERE "transaction_id" = ${transactionId} FOR UPDATE`;
      const transaction = await tx.transaction.findUniqueOrThrow({
        where: { transactionId },
      });
      const returning =
        transaction.status === 'Pending Refund' &&
        transaction.itemReceivedConfirmedByBuyerAt &&
        !transaction.itemReturnConfirmedAt;
      if (
        !returning &&
        (!['Pending', 'Processing'].includes(transaction.status ?? '') ||
          transaction.deliveryMethod !== 'Meetup' ||
          transaction.cancellationResponse === 'Pending' ||
          transaction.activeReportId)
      ) {
        throw new BadRequestException(
          'This transaction cannot arrange a handover now',
        );
      }
      // Flow 1: a meetup is arranged only after the seller has confirmed the
      // payment. Uploading a slip (Pending -> Processing) is not enough; the
      // seller's check is its own step, and skipping it let a deal jump from
      // step 3 to step 4. Mirrors `paymentRequired` in transaction.service.ts
      // — inlined here since this service does not depend on that one.
      if (!returning && !transaction.paymentConfirmedBySellerAt) {
        const paymentRequired =
          transaction.offerId === null
            ? true
            : Number(
                (
                  await tx.offer.findUnique({
                    where: { offerId: transaction.offerId },
                  })
                )?.additionalMoney ?? 0,
              ) > 0;
        if (paymentRequired) {
          throw new BadRequestException(
            'The seller has to confirm the payment before a meetup is arranged',
          );
        }
      }
      const { date, time, location } = createAppointmentDto;
      const previous = await tx.appointmentCard.findFirst({
        where: { transactionId, deletedAt: null },
        orderBy: [{ createdAt: 'desc' }, { appointmentId: 'desc' }],
      });
      // §appointment loop fix — retire whatever card was live before this
      // proposal. A superseded Pending card is also a spent proposal, so it
      // gets Rejected; a superseded Confirmed card keeps its status for
      // history. Both get deleted_at, so if THIS new card is later rejected the
      // deal cannot fall back to the old Confirmed one.
      const supersededAt = new Date();
      await tx.appointmentCard.updateMany({
        where: { transactionId, status: 'Pending', deletedAt: null },
        data: { status: 'Rejected', deletedAt: supersededAt },
      });
      await tx.appointmentCard.updateMany({
        where: { transactionId, status: 'Confirmed', deletedAt: null },
        data: { deletedAt: supersededAt },
      });
      const appointment = await tx.appointmentCard.create({
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
      await tx.notification.create({
        data: {
          userId:
            userId === transaction.buyerId
              ? transaction.sellerId
              : transaction.buyerId,
          eventKey: `appointment:${appointment.appointmentId}:proposed`,
          title: previous ? 'Meetup change proposed' : 'New meetup proposed',
          body: `${date} at ${time}, ${location}. Please confirm or decline this appointment.`,
          href: `/history/${transactionId}`,
        },
      });
      return this.serializeAppointment(appointment);
    });
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
    return appointments.map((appointment) =>
      this.serializeAppointment(appointment),
    );
  }

  /**
   * §7.1/§7.5.3 — GET /admin/transactions/{id}/message. No participant check
   * (an admin is neither party), and the room is read, never created — if
   * nobody has messaged yet there is simply no chat evidence to show, and an
   * admin GET creating a room as a side effect would be strange.
   */
  async getChatHistoryForAdmin(transactionId: number) {
    const room = await this.prisma.chatRoom.findFirst({
      where: { transactionId },
    });
    if (!room) {
      return { room_id: null, messages: [] };
    }
    const messages = await this.prisma.chatMessage.findMany({
      where: { roomId: room.roomId },
      include: { sender: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      room_id: room.roomId,
      messages: messages.map((message) => this.serializeMessage(message, true)),
    };
  }

  /** §7.1/§7.5.3 — GET /admin/transactions/{id}/appointment-cards, same
   * no-participant-check reasoning as `getChatHistoryForAdmin`. */
  async getAppointmentCardsForAdmin(transactionId: number) {
    const appointments = await this.prisma.appointmentCard.findMany({
      where: { transactionId },
      include: { proposer: true },
      orderBy: { createdAt: 'desc' },
    });
    return appointments.map((appointment) =>
      this.serializeAppointment(appointment),
    );
  }
}
