import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MessageOverride } from '../dto/message-override.dto';
import { getItemAvailability } from '../items/item-availability';
import { displayName } from '../common/utils/display-name';
import { validateText } from '../common/utils/schema-validation';

export interface GiveawayImage {
  image_url: string;
  display_order: number;
}

export interface CreateGiveawayPayload {
  item_id?: number;
  quantity?: number;
  description?: string;
  pickup_location?: string;
  allocation_method?: string;
  register_start?: string;
  register_deadline?: string;
  pickup_start?: string;
  pickup_deadline?: string;
  images?: GiveawayImage[];
}

export interface SelectRecipientsPayload {
  receiver_ids?: number[];
}

export interface ForfeitPayload {
  confirm?: boolean;
}

export interface ScanQrPayload {
  token?: string;
}

export interface ConfirmQrPayload {
  token?: string;
}

export interface SendGiveawayMessagePayload {
  content?: string;
  image_urls?: string[];
}

/** §6.2 — same 7-day display lifetime as transactions.service.ts. */
const IMAGE_DISPLAY_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/** One code per 15 minutes, shared by qrGenerate/qrScan/qrConfirm. */
const QR_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class GiveawaysService {
  constructor(private readonly prisma: PrismaService) {}

  private id(value: string, prefix: string) {
    const match = value.match(new RegExp(`^(?:${prefix}_)?(\\d+)$`, 'i'));
    if (!match) throw new BadRequestException(`${prefix}_id ไม่ถูกต้อง`);
    return Number(match[1]);
  }

  private label(prefix: string, value: number) {
    return `${prefix}_${String(value).padStart(3, '0')}`;
  }

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

  async create(payload: CreateGiveawayPayload, giverId: number) {
    // Giveaway_Post.description is VARCHAR(2000).
    if ((payload.description?.length ?? 0) > 2000) {
      throw new BadRequestException('description ยาวได้ไม่เกิน 2000 ตัวอักษร');
    }
    if (
      !payload.item_id ||
      !payload.pickup_location ||
      !payload.allocation_method
    ) {
      throw new BadRequestException(
        'item_id, pickup_location และ allocation_method จำเป็นต้องระบุ',
      );
    }
    if (!Number.isSafeInteger(payload.item_id) || payload.item_id < 1) {
      throw new BadRequestException('item_id ไม่ถูกต้อง');
    }
    if (
      !['FirstCome', 'Random', 'Manual'].includes(payload.allocation_method)
    ) {
      throw new BadRequestException('allocation_method ไม่ถูกต้อง');
    }
    const quantity = payload.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('quantity ต้องเป็นจำนวนเต็มที่มากกว่า 0');
    }
    const registerStart = payload.register_start
      ? new Date(payload.register_start)
      : null;
    const registerDeadline = payload.register_deadline
      ? new Date(payload.register_deadline)
      : null;
    const pickupStart = payload.pickup_start
      ? new Date(payload.pickup_start)
      : null;
    const pickupDeadline = payload.pickup_deadline
      ? new Date(payload.pickup_deadline)
      : null;
    if (payload.allocation_method !== 'FirstCome' && !registerDeadline) {
      throw new BadRequestException(
        'A registration deadline is required for Random and Manual giveaways',
      );
    }
    if (registerStart && Number.isNaN(registerStart.getTime())) {
      throw new BadRequestException('register_start ไม่ถูกต้อง');
    }
    if (registerDeadline && Number.isNaN(registerDeadline.getTime())) {
      throw new BadRequestException('register_deadline ไม่ถูกต้อง');
    }
    if (pickupStart && Number.isNaN(pickupStart.getTime())) {
      throw new BadRequestException('pickup_start ไม่ถูกต้อง');
    }
    if (pickupDeadline && Number.isNaN(pickupDeadline.getTime())) {
      throw new BadRequestException('pickup_deadline ไม่ถูกต้อง');
    }
    if (
      registerStart &&
      registerDeadline &&
      registerStart >= registerDeadline
    ) {
      throw new BadRequestException(
        'register_start ต้องอยู่ก่อน register_deadline',
      );
    }
    if (pickupStart && pickupDeadline && pickupStart >= pickupDeadline) {
      throw new BadRequestException(
        'pickup_start ต้องอยู่ก่อน pickup_deadline',
      );
    }
    if (registerDeadline && pickupStart && registerDeadline > pickupStart) {
      throw new BadRequestException(
        'register_deadline ต้องอยู่ก่อนหรือพร้อมกับ pickup_start',
      );
    }
    if (
      !pickupStart &&
      pickupDeadline &&
      registerDeadline &&
      registerDeadline >= pickupDeadline
    ) {
      throw new BadRequestException(
        'register_deadline ต้องอยู่ก่อน pickup_deadline',
      );
    }

    const itemId = payload.item_id;
    const pickupLocation = payload.pickup_location;
    const allocationMethod = payload.allocation_method;
    const giveaway = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "item_id" FROM "Item" WHERE "item_id" = ${itemId} FOR UPDATE`;
      const item = await tx.item.findUnique({ where: { itemId } });
      if (!item) throw new NotFoundException('ไม่พบสินค้า');
      if (item.deletedAt) throw new ConflictException('สินค้านี้ถูกลบไปแล้ว');
      if (item.ownerId !== giverId)
        throw new ForbiddenException('Only the owner can give away this item');
      const { available } = await getItemAvailability(tx, itemId);
      if (quantity > available)
        throw new BadRequestException(
          'Giveaway quantity exceeds available inventory quantity',
        );

      return tx.giveawayPost.create({
        data: {
          giverId,
          itemId,
          quantity,
          description: payload.description,
          pickupLocation,
          allocationMethod,
          registerStart,
          registerDeadline,
          pickupStart,
          pickupDeadline,
          images: {
            create: (payload.images ?? []).map((image) => ({
              imageUrl: image.image_url,
              displayOrder: image.display_order ?? 0,
            })),
          },
        },
        include: {
          item: true,
          images: { orderBy: { displayOrder: 'asc' } },
          giver: true,
        },
      });
    });
    return this.serializeGiveaway(giveaway, 0);
  }

  private serializeGiveaway(
    giveaway: {
      giveawayId: number;
      itemId: number;
      item: { name: string };
      description: string | null;
      pickupLocation: string;
      giverId: number;
      allocationMethod: string;
      quantity: number;
      registerStart: Date | null;
      registerDeadline: Date | null;
      pickupStart: Date | null;
      pickupDeadline: Date | null;
      status: string | null;
      createdAt: Date | null;
      images: { imageUrl: string; displayOrder: number | null }[];
      giver: {
        userId: number;
        firstNameEn: string;
        lastNameEn: string;
        emailVerifiedAt: Date | null;
      };
    },
    participantCount: number,
  ) {
    return {
      giveaway_id: this.label('giveaway', giveaway.giveawayId),
      item_id: giveaway.itemId,
      item_name: giveaway.item.name,
      description: giveaway.description,
      pickup_location: giveaway.pickupLocation,
      giver_id: giveaway.giverId,
      giver: this.serializeUserSummary(giveaway.giver),
      allocation_method: giveaway.allocationMethod,
      quantity: giveaway.quantity,
      register_start: giveaway.registerStart,
      register_deadline: giveaway.registerDeadline,
      pickup_start: giveaway.pickupStart,
      pickup_deadline: giveaway.pickupDeadline,
      participant_count: participantCount,
      remaining_slots: Math.max(giveaway.quantity - participantCount, 0),
      registration_open:
        giveaway.status === 'Active' &&
        (!giveaway.registerStart || giveaway.registerStart <= new Date()) &&
        (!giveaway.registerDeadline ||
          giveaway.registerDeadline > new Date()) &&
        (giveaway.allocationMethod !== 'FirstCome' ||
          participantCount < giveaway.quantity),
      all_registered_guaranteed:
        giveaway.allocationMethod === 'Random' &&
        (giveaway.status !== 'Active' ||
          Boolean(
            giveaway.registerDeadline &&
            giveaway.registerDeadline <= new Date(),
          )) &&
        participantCount <= giveaway.quantity,
      status: giveaway.status,
      images: giveaway.images.map((image) => ({
        image_url: image.imageUrl,
        display_order: image.displayOrder,
      })),
      created_at: giveaway.createdAt,
    };
  }

  async detail(id: string) {
    const giveaway = await this.prisma.giveawayPost.findUnique({
      where: { giveawayId: this.id(id, 'giveaway') },
      include: {
        item: true,
        images: { orderBy: { displayOrder: 'asc' } },
        giver: true,
        _count: { select: { tickets: true } },
      },
    });
    if (!giveaway) throw new NotFoundException('ไม่พบโพสต์แจกของ');
    return this.serializeGiveaway(giveaway, giveaway._count.tickets);
  }

  /**
   * Not in the original endpoint table — added so the browse screen can list
   * real giveaways instead of reading from frontend mock data.
   */
  async findAll() {
    const giveaways = await this.prisma.giveawayPost.findMany({
      include: {
        item: true,
        images: { orderBy: { displayOrder: 'asc' } },
        giver: true,
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return giveaways.map((giveaway) =>
      this.serializeGiveaway(giveaway, giveaway._count.tickets),
    );
  }

  async join(id: string, receiverId: number) {
    const giveawayId = this.id(id, 'giveaway');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "giveaway_id"
        FROM "Giveaway_Post"
        WHERE "giveaway_id" = ${giveawayId}
        FOR UPDATE
      `;
      const giveaway = await tx.giveawayPost.findUnique({
        where: { giveawayId },
      });
      if (!giveaway) throw new NotFoundException('ไม่พบโพสต์แจกของ');
      if (giveaway.giverId === receiverId) {
        throw new ForbiddenException('ผู้ให้ไม่สามารถลงทะเบียนรับของตนเอง');
      }
      if (
        giveaway.status !== 'Active' ||
        (giveaway.registerDeadline && giveaway.registerDeadline <= new Date())
      ) {
        throw new ConflictException('กิจกรรมนี้ปิดรับแล้ว');
      }
      if (giveaway.registerStart && giveaway.registerStart > new Date()) {
        throw new ConflictException('ยังไม่ถึงเวลาลงทะเบียน');
      }
      if (!(await tx.user.findUnique({ where: { userId: receiverId } }))) {
        throw new NotFoundException('ไม่พบผู้รับ');
      }
      // The pair is no longer unique in the database (only one live ticket
      // is), but joining twice is still refused here whatever became of the
      // first ticket.
      const existing = await tx.giveawayTicket.findFirst({
        where: { giveawayId, receiverId },
      });
      if (existing) throw new ConflictException('ผู้ใช้นี้เข้าร่วมแล้ว');

      const participantCount = await tx.giveawayTicket.count({
        where: {
          giveawayId,
          status: { in: ['Registered', 'Waiting', 'Received'] },
        },
      });
      if (
        giveaway.allocationMethod === 'FirstCome' &&
        participantCount >= giveaway.quantity
      ) {
        throw new ConflictException('สิทธิ์รับของครบแล้ว');
      }

      // Queue numbers are unique across the entire history, including forfeits.
      // The giveaway row lock serializes concurrent registrations.
      const lastTicket = await tx.giveawayTicket.aggregate({
        where: { giveawayId },
        _max: { queueNumber: true },
      });
      const ticket = await tx.giveawayTicket.create({
        data: {
          giveawayId,
          receiverId,
          queueNumber: (lastTicket._max.queueNumber ?? 0) + 1,
          status:
            giveaway.allocationMethod === 'FirstCome'
              ? 'Waiting'
              : 'Registered',
        },
        include: { receiver: true },
      });
      const fillsFinalPlace =
        giveaway.allocationMethod === 'FirstCome' &&
        participantCount + 1 >= giveaway.quantity;
      if (fillsFinalPlace) {
        await tx.giveawayPost.update({
          where: { giveawayId },
          data: { status: 'Closed' },
        });
      }
      return {
        ...this.serializeTicket(ticket),
        registration_open: !fillsFinalPlace,
        remaining_slots: Math.max(giveaway.quantity - participantCount - 1, 0),
        guaranteed: giveaway.allocationMethod === 'FirstCome',
      };
    });
  }

  private serializeTicket(ticket: {
    ticketId: number;
    giveawayId: number;
    receiverId: number;
    queueNumber: number;
    status: string | null;
    updatedAt: Date | null;
    receiver: {
      userId: number;
      firstNameEn: string;
      lastNameEn: string;
      emailVerifiedAt: Date | null;
    };
  }) {
    return {
      ticket_id: this.label('ticket', ticket.ticketId),
      giveaway_id: this.label('giveaway', ticket.giveawayId),
      receiver_id: ticket.receiverId,
      receiver: this.serializeUserSummary(ticket.receiver),
      queue_number: ticket.queueNumber,
      status: ticket.status,
      updated_at: ticket.updatedAt,
    };
  }

  /**
   * Lets a Random/Manual giver decide "enough people have registered" and
   * close the window themselves instead of waiting for `registerDeadline`.
   * `draw()`/`select()` already refuse to run before that deadline — this
   * just moves it to now, so the very next call to either succeeds. FirstCome
   * has no equivalent: it resolves continuously as people register, so there
   * is nothing to "close" ahead of a draw.
   */
  async closeRegistrationEarly(id: string, giverId: number) {
    const giveawayId = this.id(id, 'giveaway');
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "giveaway_id"
        FROM "Giveaway_Post"
        WHERE "giveaway_id" = ${giveawayId}
        FOR UPDATE
      `;
      const giveaway = await tx.giveawayPost.findUnique({
        where: { giveawayId },
      });
      if (!giveaway) throw new NotFoundException('ไม่พบโพสต์แจกของ');
      if (giveaway.giverId !== giverId) {
        throw new ForbiddenException(
          'เฉพาะผู้ให้เท่านั้นที่ปิดรับลงทะเบียนได้',
        );
      }
      if (!['Random', 'Manual'].includes(giveaway.allocationMethod)) {
        throw new BadRequestException(
          'ปิดรับลงทะเบียนก่อนกำหนดได้เฉพาะวิธี Random หรือ Manual',
        );
      }
      if (giveaway.status !== 'Active') {
        throw new ConflictException('กิจกรรมนี้ไม่ได้เปิดรับลงทะเบียนอยู่');
      }
      if (giveaway.registerDeadline && giveaway.registerDeadline <= now) {
        throw new ConflictException('การลงทะเบียนปิดไปแล้ว');
      }
      await tx.giveawayPost.update({
        where: { giveawayId },
        data: { registerDeadline: now },
      });
    });
    return {
      giveaway_id: this.label('giveaway', giveawayId),
      register_deadline: now,
    };
  }

  async draw(id: string, giverId: number) {
    const giveawayId = this.id(id, 'giveaway');
    const winners = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "giveaway_id"
        FROM "Giveaway_Post"
        WHERE "giveaway_id" = ${giveawayId}
        FOR UPDATE
      `;
      const giveaway = await tx.giveawayPost.findUnique({
        where: { giveawayId },
      });
      if (!giveaway) throw new NotFoundException('ไม่พบโพสต์แจกของ');
      if (giveaway.giverId !== giverId) {
        throw new ForbiddenException('เฉพาะผู้ให้เท่านั้นที่จับฉลากได้');
      }
      if (giveaway.allocationMethod !== 'Random') {
        throw new BadRequestException('โพสต์นี้ไม่ได้ใช้วิธี Random');
      }
      if (
        giveaway.status !== 'Active' ||
        !giveaway.registerDeadline ||
        giveaway.registerDeadline > new Date()
      ) {
        throw new ConflictException(
          'Allocation is only available after registration closes',
        );
      }
      const tickets = await tx.giveawayTicket.findMany({
        where: { giveawayId, status: 'Registered' },
        include: { receiver: true },
        orderBy: { ticketId: 'asc' },
      });
      const selected = this.pickRandomTickets(tickets, giveaway.quantity);
      const winnerIds = selected.map((ticket) => ticket.ticketId);
      await tx.giveawayTicket.updateMany({
        where: {
          giveawayId,
          status: 'Registered',
          ticketId: { in: winnerIds },
        },
        data: { status: 'Waiting', updatedAt: new Date() },
      });
      await tx.giveawayTicket.updateMany({
        where: {
          giveawayId,
          status: 'Registered',
          ticketId: { notIn: winnerIds },
        },
        data: { status: 'NotSelected', updatedAt: new Date() },
      });
      await tx.giveawayPost.update({
        where: { giveawayId },
        data: { status: 'Closed' },
      });
      if (!(await tx.chatRoom.findFirst({ where: { giveawayId } }))) {
        await tx.chatRoom.create({ data: { giveawayId } });
      }
      return selected;
    });
    return {
      giveaway_id: this.label('giveaway', giveawayId),
      allocation_method: 'Random',
      recipients: winners.map((ticket) => this.asRecipient(ticket, 'Waiting')),
      status: 'drawn',
    };
  }

  private pickRandomTickets<T>(tickets: T[], capacity: number): T[] {
    if (tickets.length <= capacity) return [...tickets];
    const shuffled = [...tickets];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [
        shuffled[swapIndex],
        shuffled[index],
      ];
    }
    return shuffled.slice(0, capacity);
  }

  async select(id: string, receiverIds: number[], giverId: number) {
    const giveawayId = this.id(id, 'giveaway');
    const uniqueIds = [...new Set(receiverIds)];
    if (uniqueIds.length === 0)
      throw new BadRequestException('ต้องระบุ receiver_ids');
    const selected = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "giveaway_id"
        FROM "Giveaway_Post"
        WHERE "giveaway_id" = ${giveawayId}
        FOR UPDATE
      `;
      const giveaway = await tx.giveawayPost.findUnique({
        where: { giveawayId },
      });
      if (!giveaway) throw new NotFoundException('ไม่พบโพสต์แจกของ');
      if (giveaway.giverId !== giverId) {
        throw new ForbiddenException('เฉพาะผู้ให้เท่านั้นที่เลือกผู้รับได้');
      }
      if (giveaway.allocationMethod !== 'Manual') {
        throw new BadRequestException('โพสต์นี้ไม่ได้ใช้วิธี Manual');
      }
      if (
        giveaway.status !== 'Active' ||
        !giveaway.registerDeadline ||
        giveaway.registerDeadline > new Date()
      ) {
        throw new ConflictException(
          'Allocation is only available after registration closes',
        );
      }
      if (uniqueIds.length > giveaway.quantity) {
        throw new BadRequestException(
          `เลือกผู้รับได้สูงสุด ${giveaway.quantity} คน`,
        );
      }
      const tickets = await tx.giveawayTicket.findMany({
        where: {
          giveawayId,
          receiverId: { in: uniqueIds },
          status: 'Registered',
        },
        include: { receiver: true },
      });
      if (tickets.length !== uniqueIds.length) {
        throw new NotFoundException('ผู้รับบางคนไม่มี ticket ที่รอการเลือก');
      }
      await tx.giveawayTicket.updateMany({
        where: {
          giveawayId,
          status: 'Registered',
          receiverId: { in: uniqueIds },
        },
        data: { status: 'Waiting', updatedAt: new Date() },
      });
      await tx.giveawayTicket.updateMany({
        where: {
          giveawayId,
          status: 'Registered',
          receiverId: { notIn: uniqueIds },
        },
        data: { status: 'NotSelected', updatedAt: new Date() },
      });
      await tx.giveawayPost.update({
        where: { giveawayId },
        data: { status: 'Closed' },
      });
      if (!(await tx.chatRoom.findFirst({ where: { giveawayId } }))) {
        await tx.chatRoom.create({ data: { giveawayId } });
      }
      return tickets;
    });
    return {
      giveaway_id: this.label('giveaway', giveawayId),
      allocation_method: 'Manual',
      recipients: selected.map((ticket) => this.asRecipient(ticket, 'Waiting')),
      status: 'selected',
    };
  }

  private asRecipient(
    ticket: {
      ticketId: number;
      receiverId: number;
      queueNumber: number;
      status: string | null;
      receiver: {
        userId: number;
        firstNameEn: string;
        lastNameEn: string;
        emailVerifiedAt: Date | null;
      };
    },
    statusOverride?: string,
  ) {
    const status = statusOverride ?? ticket.status ?? 'Registered';
    const outcomeByStatus: Record<string, string> = {
      Registered: 'registered',
      Waiting: 'selected',
      NotSelected: 'not_selected',
      Received: 'received',
      Forfeited: 'forfeited',
      Expired: 'expired',
    };
    return {
      recipient_id: this.label('recipient', ticket.ticketId),
      receiver_id: ticket.receiverId,
      receiver: this.serializeUserSummary(ticket.receiver),
      ticket_id: this.label('ticket', ticket.ticketId),
      queue_number: ticket.queueNumber,
      status: outcomeByStatus[status] ?? status.toLowerCase(),
      ticket_status: status,
    };
  }

  async recipients(id: string) {
    const giveawayId = this.id(id, 'giveaway');
    const giveaway = await this.prisma.giveawayPost.findUnique({
      where: { giveawayId },
    });
    if (!giveaway) {
      throw new NotFoundException('ไม่พบโพสต์แจกของ');
    }
    if (giveaway.pickupDeadline && giveaway.pickupDeadline <= new Date()) {
      await this.prisma.giveawayTicket.updateMany({
        where: { giveawayId, status: 'Waiting' },
        data: { status: 'Expired', updatedAt: new Date() },
      });
    }
    const tickets = await this.prisma.giveawayTicket.findMany({
      where: { giveawayId },
      include: { receiver: true },
      orderBy: { ticketId: 'asc' },
    });
    return {
      giveaway_id: this.label('giveaway', giveawayId),
      recipients: tickets.map((ticket) => this.asRecipient(ticket)),
    };
  }

  async forfeit(id: string, confirm: boolean, receiverId: number) {
    if (!confirm) throw new BadRequestException('ต้องยืนยันการสละสิทธิ์');
    const ticketId = this.id(id, 'recipient');
    const ticket = await this.prisma.giveawayTicket.findUnique({
      where: { ticketId },
    });
    if (!ticket) throw new NotFoundException('ไม่พบผู้รับ');
    if (ticket.receiverId !== receiverId) {
      throw new ForbiddenException('สละสิทธิ์ของผู้รับคนอื่นไม่ได้');
    }
    if (ticket.status !== 'Waiting') {
      throw new ConflictException('ticket นี้ไม่ได้อยู่ในสถานะพร้อมรับของ');
    }
    await this.prisma.giveawayTicket.update({
      where: { ticketId },
      data: { status: 'Forfeited', updatedAt: new Date() },
    });
    return {
      recipient_id: this.label('recipient', ticketId),
      confirm: true,
      status: 'forfeited',
    };
  }

  async qrGenerate(
    giveawayIdValue: string,
    ticketIdValue: string,
    receiverId: number,
  ) {
    const giveawayId = this.id(giveawayIdValue, 'giveaway');
    const ticketId = this.id(ticketIdValue, 'ticket');
    const ticket = await this.prisma.giveawayTicket.findFirst({
      where: { ticketId, giveawayId, status: 'Waiting' },
      include: { giveaway: true },
    });
    if (!ticket) throw new NotFoundException('ไม่พบ ticket ที่พร้อมรับของ');
    if (ticket.receiverId !== receiverId) {
      throw new ForbiddenException('เปิด QR ของผู้รับคนอื่นไม่ได้');
    }
    if (
      ticket.giveaway.pickupDeadline &&
      ticket.giveaway.pickupDeadline <= new Date()
    ) {
      await this.prisma.giveawayTicket.update({
        where: { ticketId },
        data: { status: 'Expired', updatedAt: new Date() },
      });
      throw new ConflictException('เลยกำหนดรับของแล้ว');
    }
    if (
      ticket.giveaway.pickupStart &&
      ticket.giveaway.pickupStart > new Date()
    ) {
      throw new ConflictException('ยังไม่ถึงเวลารับของ');
    }
    // One code per 15 minutes: while the current token is still inside its
    // window, hand back the same one with the seconds it has left, so reopening
    // the ticket keeps the original countdown instead of minting a new code.
    const now = Date.now();
    const aliveUntil = ticket.qrIssuedAt
      ? ticket.qrIssuedAt.getTime() + QR_TTL_MS
      : 0;
    if (ticket.qrToken && aliveUntil > now) {
      return {
        giveaway_id: this.label('giveaway', giveawayId),
        ticket_id: this.label('ticket', ticketId),
        token: ticket.qrToken,
        expires_in_seconds: Math.ceil((aliveUntil - now) / 1000),
        expires_at: ticket.giveaway.pickupDeadline,
      };
    }

    const token = randomUUID();
    await this.prisma.giveawayTicket.update({
      where: { ticketId },
      data: { qrToken: token, qrIssuedAt: new Date(), updatedAt: new Date() },
    });
    return {
      giveaway_id: this.label('giveaway', giveawayId),
      ticket_id: this.label('ticket', ticketId),
      token,
      expires_in_seconds: Math.floor(QR_TTL_MS / 1000),
      expires_at: ticket.giveaway.pickupDeadline,
    };
  }

  /**
   * สแกน QR — แค่ตรวจสอบความถูกต้อง ไม่เปลี่ยนสถานะ
   * ต้องเรียก qrConfirm เพื่อยืนยันรับของจริง
   */
  async qrScan(
    giveawayIdValue: string,
    ticketIdValue: string,
    token = '',
    giverId: number,
  ) {
    const giveawayId = this.id(giveawayIdValue, 'giveaway');
    const ticketId = this.id(ticketIdValue, 'ticket');
    const ticket = await this.prisma.giveawayTicket.findFirst({
      where: { ticketId, giveawayId },
      include: { giveaway: true },
    });
    if (!ticket) throw new NotFoundException('ไม่พบ ticket');
    if (ticket.giveaway.giverId !== giverId) {
      throw new ForbiddenException('เฉพาะผู้ให้เท่านั้นที่สแกน QR ได้');
    }
    if (
      ticket.status === 'Waiting' &&
      ticket.giveaway.pickupDeadline &&
      ticket.giveaway.pickupDeadline <= new Date()
    ) {
      await this.prisma.giveawayTicket.update({
        where: { ticketId },
        data: { status: 'Expired', updatedAt: new Date() },
      });
      return new MessageOverride('QR หมดอายุ', {
        giveaway_id: this.label('giveaway', giveawayId),
        ticket_id: this.label('ticket', ticketId),
        valid: false,
        status: 'expired',
        checked_at: new Date(),
      });
    }
    const fresh = Boolean(
      ticket.qrIssuedAt && Date.now() - ticket.qrIssuedAt.getTime() < QR_TTL_MS,
    );
    const valid =
      Boolean(token) &&
      ticket.qrToken === token &&
      fresh &&
      ticket.status === 'Waiting';
    // ไม่เปลี่ยนสถานะ — แค่ตรวจสอบ
    return new MessageOverride(
      valid ? 'QR ถูกต้อง รอยืนยัน' : 'QR ไม่ถูกต้อง',
      {
        giveaway_id: this.label('giveaway', giveawayId),
        ticket_id: this.label('ticket', ticketId),
        valid,
        status: valid ? 'pending_confirm' : 'invalid',
        checked_at: new Date(),
      },
    );
  }

  /**
   * ยืนยันรับของหลังสแกน QR — เปลี่ยนสถานะเป็น Received
   */
  async qrConfirm(
    giveawayIdValue: string,
    ticketIdValue: string,
    token = '',
    giverId: number,
  ) {
    const giveawayId = this.id(giveawayIdValue, 'giveaway');
    const ticketId = this.id(ticketIdValue, 'ticket');
    const ticket = await this.prisma.giveawayTicket.findFirst({
      where: { ticketId, giveawayId },
      include: { giveaway: true },
    });
    if (!ticket) throw new NotFoundException('ไม่พบ ticket');
    if (ticket.giveaway.giverId !== giverId) {
      throw new ForbiddenException('เฉพาะผู้ให้เท่านั้นที่ยืนยันรับของได้');
    }
    if (
      ticket.giveaway.pickupDeadline &&
      ticket.giveaway.pickupDeadline <= new Date()
    ) {
      await this.prisma.giveawayTicket.update({
        where: { ticketId },
        data: { status: 'Expired', updatedAt: new Date() },
      });
      throw new ConflictException('เลยกำหนดเวลารับของแล้ว');
    }

    const fresh = Boolean(
      ticket.qrIssuedAt && Date.now() - ticket.qrIssuedAt.getTime() < QR_TTL_MS,
    );
    const valid =
      Boolean(token) &&
      ticket.qrToken === token &&
      fresh &&
      ticket.status === 'Waiting';
    if (!valid) {
      throw new BadRequestException('QR ไม่ถูกต้องหรือตั๋วถูกใช้แล้ว');
    }

    await this.prisma.giveawayTicket.update({
      where: { ticketId },
      data: { status: 'Received', updatedAt: new Date() },
    });

    return new MessageOverride('ยืนยันรับของสำเร็จ', {
      giveaway_id: this.label('giveaway', giveawayId),
      ticket_id: this.label('ticket', ticketId),
      valid: true,
      status: 'received',
      confirmed_at: new Date(),
    });
  }

  /**
   * §6 Chat & Image System, extended to giveaways. `transactions.service.ts`
   * only ever wired this for a 1:1 deal room — a giveaway room is a group
   * chat (the giver plus every entrant, see frontend/docs/design/api-gaps.md
   * §6), so membership here is "the giver, or anyone who ever held a ticket",
   * not a party-of-two check.
   */
  private async assertGiveawayMember(giveawayId: number, userId: number) {
    const giveaway = await this.prisma.giveawayPost.findUnique({
      where: { giveawayId },
    });
    if (!giveaway) throw new NotFoundException('ไม่พบโพสต์แจกของ');
    if (giveaway.giverId === userId) return;
    const ticket = await this.prisma.giveawayTicket.findFirst({
      where: {
        giveawayId,
        receiverId: userId,
        status: { in: ['Waiting', 'Received'] },
      },
    });
    if (!ticket) {
      throw new ForbiddenException('คุณไม่ได้อยู่ในห้องแชทนี้');
    }
  }

  private async getOrCreateGiveawayChatRoom(
    giveawayId: number,
    userId: number,
  ) {
    await this.assertGiveawayMember(giveawayId, userId);
    let room = await this.prisma.chatRoom.findFirst({ where: { giveawayId } });
    if (!room) {
      room = await this.prisma.chatRoom.create({ data: { giveawayId } });
    }
    return room;
  }

  /** Same shape as `transactions.service.ts`'s `serializeMessage`. */
  private serializeGiveawayMessage(message: {
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
    const expired =
      Date.now() - createdAt.getTime() > IMAGE_DISPLAY_LIFETIME_MS;
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

  /**
   * GET /giveaways/{id}/message. Wrapped in `{ room_id, messages }` — same
   * reason as `transactions.service.ts`'s `getChatHistory`: a brand-new room
   * with zero messages still needs to report its `room_id`.
   */
  async getGiveawayMessages(idValue: string, userId: number) {
    const giveawayId = this.id(idValue, 'giveaway');
    const room = await this.getOrCreateGiveawayChatRoom(giveawayId, userId);
    const messages = await this.prisma.chatMessage.findMany({
      where: { roomId: room.roomId },
      include: { sender: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      room_id: room.roomId,
      messages: messages.map((message) =>
        this.serializeGiveawayMessage(message),
      ),
    };
  }

  /** POST /giveaways/{id}/message — max 5 images (§6.1), enforced in the DTO. */
  async sendGiveawayMessage(
    idValue: string,
    payload: SendGiveawayMessagePayload,
    userId: number,
  ) {
    validateText(payload.content, 'content', 2000);
    const { content, image_urls } = payload;
    if (!content && (!image_urls || image_urls.length === 0)) {
      throw new BadRequestException(
        'ข้อความต้องมี content หรือ image_urls อย่างน้อยหนึ่งอย่าง',
      );
    }
    if (image_urls && image_urls.length > 5) {
      throw new BadRequestException('ส่งรูปภาพได้สูงสุด 5 รูปต่อข้อความ');
    }

    const giveawayId = this.id(idValue, 'giveaway');
    const room = await this.getOrCreateGiveawayChatRoom(giveawayId, userId);

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId: room.roomId,
        senderId: userId,
        content: content || null,
        imageUrls: image_urls ?? undefined,
      },
      include: { sender: true },
    });
    return this.serializeGiveawayMessage(message);
  }
}
