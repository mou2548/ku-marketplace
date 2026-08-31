import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MessageOverride } from '../dto/message-override.dto';

export interface GiveawayImage {
  image_url: string;
  display_order: number;
}

export interface CreateGiveawayPayload {
  item_name?: string;
  description?: string;
  pickup_location?: string;
  allocation_method?: string;
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

  async create(payload: CreateGiveawayPayload, giverId: number) {
    if (
      !payload.item_name ||
      !payload.pickup_location ||
      !payload.allocation_method
    ) {
      throw new BadRequestException(
        'item_name, pickup_location และ allocation_method จำเป็นต้องระบุ',
      );
    }
    if (
      !['FirstCome', 'Random', 'Manual'].includes(payload.allocation_method)
    ) {
      throw new BadRequestException('allocation_method ไม่ถูกต้อง');
    }
    const deadline = payload.pickup_deadline
      ? new Date(payload.pickup_deadline)
      : null;
    if (deadline && Number.isNaN(deadline.getTime())) {
      throw new BadRequestException('pickup_deadline ไม่ถูกต้อง');
    }

    const giveaway = await this.prisma.giveawayPost.create({
      data: {
        giverId,
        itemName: payload.item_name,
        description: payload.description,
        pickupLocation: payload.pickup_location,
        allocationMethod: payload.allocation_method,
        pickupDeadline: deadline,
        images: {
          create: (payload.images ?? []).map((image) => ({
            imageUrl: image.image_url,
            displayOrder: image.display_order ?? 0,
          })),
        },
      },
      include: { images: { orderBy: { displayOrder: 'asc' } } },
    });
    return this.serializeGiveaway(giveaway, 0);
  }

  private serializeGiveaway(
    giveaway: {
      giveawayId: number;
      itemName: string;
      description: string | null;
      pickupLocation: string;
      giverId: number;
      allocationMethod: string;
      pickupDeadline: Date | null;
      status: string | null;
      createdAt: Date | null;
      images: { imageUrl: string; displayOrder: number | null }[];
    },
    participantCount: number,
  ) {
    return {
      giveaway_id: this.label('giveaway', giveaway.giveawayId),
      item_name: giveaway.itemName,
      description: giveaway.description,
      pickup_location: giveaway.pickupLocation,
      giver_id: giveaway.giverId,
      allocation_method: giveaway.allocationMethod,
      pickup_deadline: giveaway.pickupDeadline,
      participant_count: participantCount,
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
        images: { orderBy: { displayOrder: 'asc' } },
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
        images: { orderBy: { displayOrder: 'asc' } },
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
    const giveaway = await this.prisma.giveawayPost.findUnique({
      where: { giveawayId },
    });
    if (!giveaway) throw new NotFoundException('ไม่พบโพสต์แจกของ');
    if (giveaway.status !== 'Active')
      throw new ConflictException('กิจกรรมนี้ปิดรับแล้ว');
    if (
      !(await this.prisma.user.findUnique({ where: { userId: receiverId } }))
    ) {
      throw new NotFoundException('ไม่พบผู้รับ');
    }
    const existing = await this.prisma.giveawayTicket.findFirst({
      where: { giveawayId, receiverId },
    });
    if (existing) throw new ConflictException('ผู้ใช้นี้เข้าร่วมแล้ว');
    const ticket = await this.prisma.giveawayTicket.create({
      data: { giveawayId, receiverId, status: 'Waiting' },
    });
    return this.serializeTicket(ticket);
  }

  private serializeTicket(ticket: {
    ticketId: number;
    giveawayId: number;
    receiverId: number;
    status: string | null;
    updatedAt: Date | null;
  }) {
    return {
      ticket_id: this.label('ticket', ticket.ticketId),
      giveaway_id: this.label('giveaway', ticket.giveawayId),
      receiver_id: ticket.receiverId,
      status: ticket.status,
      updated_at: ticket.updatedAt,
    };
  }

  async draw(id: string) {
    const giveawayId = this.id(id, 'giveaway');
    const result = await this.prisma.$transaction(async (tx) => {
      const giveaway = await tx.giveawayPost.findUnique({
        where: { giveawayId },
      });
      if (!giveaway) throw new NotFoundException('ไม่พบโพสต์แจกของ');
      if (giveaway.allocationMethod !== 'Random') {
        throw new BadRequestException('โพสต์นี้ไม่ได้ใช้วิธี Random');
      }
      const tickets = await tx.giveawayTicket.findMany({
        where: { giveawayId, status: 'Waiting' },
      });
      if (tickets.length === 0)
        throw new ConflictException('ยังไม่มีผู้เข้าร่วมที่รอจับฉลาก');
      const winner = tickets[Math.floor(Math.random() * tickets.length)];
      await tx.giveawayTicket.updateMany({
        where: {
          giveawayId,
          status: 'Waiting',
          ticketId: { not: winner.ticketId },
        },
        data: { status: 'Expired', updatedAt: new Date() },
      });
      await tx.giveawayPost.update({
        where: { giveawayId },
        data: { status: 'Closed' },
      });
      return winner;
    });
    return {
      giveaway_id: this.label('giveaway', giveawayId),
      allocation_method: 'Random',
      recipients: [this.asRecipient(result)],
      status: 'drawn',
    };
  }

  async select(id: string, receiverIds: number[]) {
    const giveawayId = this.id(id, 'giveaway');
    const uniqueIds = [...new Set(receiverIds)];
    if (uniqueIds.length === 0)
      throw new BadRequestException('ต้องระบุ receiver_ids');
    const selected = await this.prisma.$transaction(async (tx) => {
      const giveaway = await tx.giveawayPost.findUnique({
        where: { giveawayId },
      });
      if (!giveaway) throw new NotFoundException('ไม่พบโพสต์แจกของ');
      if (giveaway.allocationMethod !== 'Manual') {
        throw new BadRequestException('โพสต์นี้ไม่ได้ใช้วิธี Manual');
      }
      const tickets = await tx.giveawayTicket.findMany({
        where: { giveawayId, receiverId: { in: uniqueIds }, status: 'Waiting' },
      });
      if (tickets.length !== uniqueIds.length) {
        throw new NotFoundException('ผู้รับบางคนไม่มี ticket ที่รอการเลือก');
      }
      await tx.giveawayTicket.updateMany({
        where: {
          giveawayId,
          status: 'Waiting',
          receiverId: { notIn: uniqueIds },
        },
        data: { status: 'Expired', updatedAt: new Date() },
      });
      await tx.giveawayPost.update({
        where: { giveawayId },
        data: { status: 'Closed' },
      });
      return tickets;
    });
    return {
      giveaway_id: this.label('giveaway', giveawayId),
      allocation_method: 'Manual',
      recipients: selected.map((ticket) => this.asRecipient(ticket)),
      status: 'selected',
    };
  }

  private asRecipient(ticket: {
    ticketId: number;
    receiverId: number;
    status: string | null;
  }) {
    return {
      recipient_id: this.label('recipient', ticket.ticketId),
      receiver_id: ticket.receiverId,
      ticket_id: this.label('ticket', ticket.ticketId),
      status: ticket.status === 'Received' ? 'received' : 'selected',
    };
  }

  async recipients(id: string) {
    const giveawayId = this.id(id, 'giveaway');
    if (
      !(await this.prisma.giveawayPost.findUnique({ where: { giveawayId } }))
    ) {
      throw new NotFoundException('ไม่พบโพสต์แจกของ');
    }
    const tickets = await this.prisma.giveawayTicket.findMany({
      where: { giveawayId, status: { in: ['Waiting', 'Received'] } },
      orderBy: { ticketId: 'asc' },
    });
    return {
      giveaway_id: this.label('giveaway', giveawayId),
      recipients: tickets.map((ticket) => this.asRecipient(ticket)),
    };
  }

  async forfeit(id: string, confirm: boolean) {
    if (!confirm) throw new BadRequestException('ต้องยืนยันการสละสิทธิ์');
    const ticketId = this.id(id, 'recipient');
    const ticket = await this.prisma.giveawayTicket.findUnique({
      where: { ticketId },
    });
    if (!ticket) throw new NotFoundException('ไม่พบผู้รับ');
    await this.prisma.giveawayTicket.update({
      where: { ticketId },
      data: { status: 'Expired', updatedAt: new Date() },
    });
    return {
      recipient_id: this.label('recipient', ticketId),
      confirm: true,
      status: 'forfeited',
    };
  }

  async qrGenerate(giveawayIdValue: string, ticketIdValue: string) {
    const giveawayId = this.id(giveawayIdValue, 'giveaway');
    const ticketId = this.id(ticketIdValue, 'ticket');
    const ticket = await this.prisma.giveawayTicket.findFirst({
      where: { ticketId, giveawayId, status: 'Waiting' },
    });
    if (!ticket) throw new NotFoundException('ไม่พบ ticket ที่พร้อมรับของ');
    const token = randomUUID();
    await this.prisma.giveawayTicket.update({
      where: { ticketId },
      data: { qrToken: token, updatedAt: new Date() },
    });
    const giveaway = await this.prisma.giveawayPost.findUnique({
      where: { giveawayId },
    });
    return {
      giveaway_id: this.label('giveaway', giveawayId),
      ticket_id: this.label('ticket', ticketId),
      token,
      expires_at: giveaway?.pickupDeadline,
    };
  }

  async qrScan(giveawayIdValue: string, ticketIdValue: string, token = '') {
    const giveawayId = this.id(giveawayIdValue, 'giveaway');
    const ticketId = this.id(ticketIdValue, 'ticket');
    const ticket = await this.prisma.giveawayTicket.findFirst({
      where: { ticketId, giveawayId },
    });
    if (!ticket) throw new NotFoundException('ไม่พบ ticket');
    const valid =
      Boolean(token) && ticket.qrToken === token && ticket.status === 'Waiting';
    if (valid) {
      await this.prisma.giveawayTicket.update({
        where: { ticketId },
        data: { status: 'Received', updatedAt: new Date() },
      });
    }
    return new MessageOverride(valid ? 'ตรวจสอบ QR สำเร็จ' : 'QR ไม่ถูกต้อง', {
      giveaway_id: this.label('giveaway', giveawayId),
      ticket_id: this.label('ticket', ticketId),
      valid,
      status: valid ? 'received' : 'invalid',
      checked_at: new Date(),
    });
  }
}
