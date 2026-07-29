import { Injectable } from '@nestjs/common';

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
  private ok(message: string, data: Record<string, unknown>) {
    return { success: true, message, data };
  }

  create(payload: CreateGiveawayPayload) {
    return this.ok('สร้างโพสต์แจกของสำเร็จ', {
      giveaway_id: 'giveaway_001',
      item_name: payload.item_name ?? 'เสื้อคณะไซส์ M',
      description: payload.description ?? 'ได้มาแต่ใส่ไม่พอดี ใหม่มาก',
      pickup_location: payload.pickup_location ?? 'หน้าตึกวิศวกรรม 1',
      allocation_method: payload.allocation_method ?? 'Random',
      pickup_deadline: payload.pickup_deadline ?? '2026-08-05T18:00:00.000Z',
      images: payload.images ?? [
        {
          image_url: 'https://r2.example/giveaways/temp/img1.jpg',
          display_order: 0,
        },
      ],
      owner_id: 'user_001',
      status: 'open',
      created_at: '2026-07-29T10:30:00.000Z',
    });
  }

  detail(id: string) {
    return this.ok('รายละเอียดโพสต์แจกของสำเร็จ', {
      giveaway_id: id,
      item_name: 'เสื้อคณะไซส์ M',
      description: 'ได้มาแต่ใส่ไม่พอดี ใหม่มาก',
      pickup_location: 'หน้าตึกวิศวกรรม 1',
      allocation_method: 'Random',
      pickup_deadline: '2026-08-05T18:00:00.000Z',
      participant_count: 3,
      status: 'open',
      images: [
        {
          image_url: 'https://r2.example/giveaways/temp/img1.jpg',
          display_order: 0,
        },
      ],
    });
  }

  join(id: string) {
    return this.ok('เข้าร่วมการแจกของสำเร็จ', {
      ticket_id: 'ticket_001',
      giveaway_id: id,
      receiver_id: 3311,
      status: 'joined',
      joined_at: '2026-07-29T10:35:00.000Z',
    });
  }

  draw(id: string) {
    return this.ok('จับฉลากสำเร็จ', {
      giveaway_id: id,
      allocation_method: 'Random',
      recipients: [
        {
          recipient_id: 'recipient_001',
          receiver_id: 3311,
          ticket_id: 'ticket_001',
          status: 'selected',
        },
      ],
      status: 'drawn',
    });
  }

  select(id: string, receiverIds: number[]) {
    const selectedIds =
      receiverIds.length > 0 ? receiverIds : [3311, 3320, 3325];

    return this.ok('เลือกผู้ชนะสำเร็จ', {
      giveaway_id: id,
      allocation_method: 'Manual',
      recipients: selectedIds.map((receiverId, index) => ({
        recipient_id: `recipient_${String(index + 1).padStart(3, '0')}`,
        receiver_id: receiverId,
        status: 'selected',
      })),
      status: 'selected',
    });
  }

  recipients(id: string) {
    return this.ok('สรุปผู้รับของสำเร็จ', {
      giveaway_id: id,
      recipients: [
        {
          recipient_id: 'recipient_001',
          receiver_id: 3311,
          ticket_id: 'ticket_001',
          status: 'selected',
        },
        {
          recipient_id: 'recipient_002',
          receiver_id: 3320,
          ticket_id: 'ticket_002',
          status: 'selected',
        },
      ],
    });
  }

  forfeit(id: string, confirm: boolean) {
    return this.ok('สละสิทธิ์สำเร็จ', {
      recipient_id: id,
      confirm: confirm === true,
      status: confirm === true ? 'forfeited' : 'selected',
    });
  }

  qrGenerate(id: string) {
    return this.ok('สร้าง QR สำเร็จ', {
      ticket_id: id,
      token: 'mock-qr-token-001',
      expires_at: '2026-08-05T18:00:00.000Z',
    });
  }

  qrScan(id: string, token = '') {
    const valid = token === 'mock-qr-token-001';

    return this.ok(valid ? 'ตรวจสอบ QR สำเร็จ' : 'QR ไม่ถูกต้อง', {
      ticket_id: id,
      token,
      valid,
      status: valid ? 'received' : 'invalid',
      checked_at: '2026-07-29T11:00:00.000Z',
    });
  }
}
