import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePostPayload {
  item_id?: number;
  post_type?: string;
  price?: number;
  quantity_total?: number;
}

export interface UpdatePostPayload {
  price?: number;
}

export interface BuyPostPayload {
  buyer_id?: number;
  delivery_method?: string;
  quantity?: number;
}

export interface CreateOfferPayload {
  proposer_id?: number;
  item_ids?: number[];
  additional_money?: number;
}

export interface AcceptOfferPayload {
  delivery_method?: string;
}

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  private ok(message: string, data: Record<string, unknown> | unknown[]) {
    return { success: true, message, data };
  }

  private id(value: string, prefix: string) {
    const match = value.match(new RegExp(`^(?:${prefix}_)?(\\d+)$`, 'i'));
    if (!match) {
      throw new BadRequestException(`${prefix}_id ไม่ถูกต้อง`);
    }
    return Number(match[1]);
  }

  private label(prefix: string, value: number) {
    return `${prefix}_${String(value).padStart(3, '0')}`;
  }

  private serializePost(post: {
    postId: number;
    itemId: number;
    postType: string;
    price: { toNumber(): number };
    quantityTotal: number;
    quantityRemaining: number;
    createdAt: Date | null;
    item: { name: string; description: string | null; status: string | null };
  }) {
    return {
      post_id: this.label('post', post.postId),
      item_id: post.itemId,
      post_type: post.postType,
      item_name: post.item.name,
      description: post.item.description,
      price: post.price.toNumber(),
      quantity_total: post.quantityTotal,
      quantity_available: post.quantityRemaining,
      status: post.quantityRemaining > 0 ? 'active' : 'sold_out',
      created_at: post.createdAt,
    };
  }

  async createPost(payload: CreatePostPayload) {
    if (!payload.item_id || !payload.post_type || payload.price === undefined) {
      throw new BadRequestException(
        'item_id, post_type และ price จำเป็นต้องระบุ',
      );
    }
    if (!['SellOnly', 'TradeOnly', 'Both'].includes(payload.post_type)) {
      throw new BadRequestException(
        'post_type ต้องเป็น SellOnly, TradeOnly หรือ Both',
      );
    }
    const quantity = payload.quantity_total ?? 1;
    const itemId = payload.item_id;
    const postType = payload.post_type;
    const price = payload.price;
    if (payload.price < 0 || quantity < 1) {
      throw new BadRequestException(
        'price ต้องไม่ติดลบและ quantity_total ต้องมากกว่า 0',
      );
    }

    const post = await this.prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { itemId } });
      if (!item) throw new NotFoundException('ไม่พบสินค้า');
      const existing = await tx.post.findUnique({ where: { itemId } });
      if (existing) throw new ConflictException('สินค้านี้มีโพสต์อยู่แล้ว');

      const created = await tx.post.create({
        data: {
          itemId,
          postType,
          price,
          quantityTotal: quantity,
          quantityRemaining: quantity,
        },
      });
      await tx.item.update({
        where: { itemId },
        data: { status: 'Listed' },
      });
      return { ...created, item };
    });

    return this.ok('สร้างโพสต์สำเร็จ', this.serializePost(post));
  }

  async findAllPosts() {
    const posts = await this.prisma.post.findMany({
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });
    return this.ok(
      'นำโพสต์ทั้งหมดมาแสดงสำเร็จ',
      posts.map((p) => this.serializePost(p)),
    );
  }

  async getPostById(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { postId: this.id(postId, 'post') },
      include: { item: true },
    });
    if (!post) throw new NotFoundException('ไม่พบโพสต์');
    return this.ok('รายละเอียดโพสต์สำเร็จ', this.serializePost(post));
  }

  async updatePostPrice(postId: string, payload: UpdatePostPayload) {
    if (payload.price === undefined || payload.price < 0) {
      throw new BadRequestException('price ต้องเป็นเลขที่ไม่ติดลบ');
    }
    const id = this.id(postId, 'post');
    const found = await this.prisma.post.findUnique({ where: { postId: id } });
    if (!found) throw new NotFoundException('ไม่พบโพสต์');
    const post = await this.prisma.post.update({
      where: { postId: id },
      data: { price: payload.price },
    });
    return this.ok('แก้ไขโพสต์สำเร็จ', {
      post_id: this.label('post', post.postId),
      price: post.price.toNumber(),
    });
  }

  async deletePost(postId: string) {
    const id = this.id(postId, 'post');
    const post = await this.prisma.post.findUnique({
      where: { postId: id },
      include: { _count: { select: { offers: true, transactions: true } } },
    });
    if (!post) throw new NotFoundException('ไม่พบโพสต์');
    if (post._count.offers > 0 || post._count.transactions > 0) {
      throw new ConflictException(
        'ลบโพสต์ที่มี offer หรือ transaction แล้วไม่ได้',
      );
    }
    await this.prisma.$transaction([
      this.prisma.post.delete({ where: { postId: id } }),
      this.prisma.item.update({
        where: { itemId: post.itemId },
        data: { status: 'Unlisted' },
      }),
    ]);
    return this.ok('ลบโพสต์สำเร็จ', {
      post_id: this.label('post', id),
      deleted: true,
    });
  }

  async buyPost(postId: string, payload: BuyPostPayload) {
    const id = this.id(postId, 'post');
    const quantity = payload.quantity ?? 1;
    const buyerId = payload.buyer_id ?? 3;
    const deliveryMethod = payload.delivery_method ?? 'Meetup';
    if (quantity < 1 || !['Meetup', 'Shipping'].includes(deliveryMethod)) {
      throw new BadRequestException('quantity หรือ delivery_method ไม่ถูกต้อง');
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { postId: id },
        include: { item: true },
      });
      if (!post) throw new NotFoundException('ไม่พบโพสต์');
      if (post.quantityRemaining < quantity) {
        throw new ConflictException('สินค้าเหลือไม่เพียงพอ');
      }
      const buyer = await tx.user.findUnique({ where: { userId: buyerId } });
      if (!buyer) throw new NotFoundException('ไม่พบผู้ซื้อ');
      const created = await tx.transaction.create({
        data: {
          postId: id,
          buyerId,
          sellerId: post.item.ownerId,
          quantity,
          deliveryMethod,
          status: 'Pending',
        },
      });
      await tx.post.update({
        where: { postId: id },
        data: { quantityRemaining: { decrement: quantity } },
      });
      return created;
    });

    return this.ok('ทำการซื้อสำเร็จ', {
      transaction_id: this.label('transaction', transaction.transactionId),
      post_id: this.label('post', transaction.postId),
      buyer_id: transaction.buyerId,
      delivery_method: transaction.deliveryMethod,
      quantity: transaction.quantity,
      status: transaction.status,
    });
  }

  async createOffer(postId: string, payload: CreateOfferPayload) {
    const id = this.id(postId, 'post');
    const proposerId = payload.proposer_id ?? 3;
    const itemIds = [...new Set(payload.item_ids ?? [])];
    const post = await this.prisma.post.findUnique({ where: { postId: id } });
    if (!post) throw new NotFoundException('ไม่พบโพสต์');
    if (
      !(await this.prisma.user.findUnique({ where: { userId: proposerId } }))
    ) {
      throw new NotFoundException('ไม่พบผู้เสนอ');
    }
    const itemCount = await this.prisma.item.count({
      where: { itemId: { in: itemIds } },
    });
    if (itemCount !== itemIds.length)
      throw new NotFoundException('ไม่พบสินค้าที่ใช้เสนอแลกบางรายการ');

    const offer = await this.prisma.offer.create({
      data: {
        postId: id,
        proposerId,
        additionalMoney: payload.additional_money ?? 0,
        items: { create: itemIds.map((itemId) => ({ itemId })) },
      },
      include: { items: true },
    });
    return this.ok('เสนอข้อแลกเปลี่ยนสำเร็จ', this.serializeOffer(offer));
  }

  private serializeOffer(offer: {
    offerId: number;
    postId: number;
    proposerId: number;
    additionalMoney: { toNumber(): number } | null;
    status: string | null;
    createdAt: Date | null;
    items: { itemId: number }[];
  }) {
    return {
      post_id: this.label('post', offer.postId),
      offer_id: this.label('offer', offer.offerId),
      offerer_id: offer.proposerId,
      item_ids: offer.items.map((item) => item.itemId),
      additional_money: offer.additionalMoney?.toNumber() ?? 0,
      status: offer.status,
      created_at: offer.createdAt,
    };
  }

  async getOffers(postId: string) {
    const id = this.id(postId, 'post');
    if (!(await this.prisma.post.findUnique({ where: { postId: id } }))) {
      throw new NotFoundException('ไม่พบโพสต์');
    }
    const offers = await this.prisma.offer.findMany({
      where: { postId: id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return this.ok('แสดงข้อแลกเปลี่ยนสำเร็จ', {
      post_id: this.label('post', id),
      offers: offers.map((offer) => this.serializeOffer(offer)),
    });
  }

  async acceptOffer(
    postId: string,
    offerId: string,
    payload: AcceptOfferPayload,
  ) {
    const postPk = this.id(postId, 'post');
    const offerPk = this.id(offerId, 'offer');
    const deliveryMethod = payload.delivery_method ?? 'Shipping';
    if (!['Meetup', 'Shipping'].includes(deliveryMethod)) {
      throw new BadRequestException('delivery_method ไม่ถูกต้อง');
    }
    const transaction = await this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findFirst({
        where: { offerId: offerPk, postId: postPk },
        include: { post: { include: { item: true } } },
      });
      if (!offer) throw new NotFoundException('ไม่พบ offer');
      if (offer.status !== 'Pending')
        throw new ConflictException('offer นี้ไม่ได้อยู่ในสถานะ Pending');
      if (offer.post.quantityRemaining < 1)
        throw new ConflictException('สินค้าไม่มีเหลือแล้ว');

      const created = await tx.transaction.create({
        data: {
          postId: postPk,
          offerId: offerPk,
          buyerId: offer.proposerId,
          sellerId: offer.post.item.ownerId,
          quantity: 1,
          deliveryMethod,
          status: 'Pending',
        },
      });
      await tx.offer.update({
        where: { offerId: offerPk },
        data: { status: 'Accepted' },
      });
      await tx.offer.updateMany({
        where: { postId: postPk, offerId: { not: offerPk }, status: 'Pending' },
        data: { status: 'Rejected' },
      });
      await tx.post.update({
        where: { postId: postPk },
        data: { quantityRemaining: { decrement: 1 } },
      });
      return created;
    });

    return this.ok('ตอบรับข้อเสนอสำเร็จ', {
      transaction_id: this.label('transaction', transaction.transactionId),
      post_id: this.label('post', postPk),
      offer_id: this.label('offer', offerPk),
      delivery_method: transaction.deliveryMethod,
      status: 'accepted',
    });
  }

  async withdrawOffer(postId: string, offerId: string) {
    return this.changeOfferStatus(
      postId,
      offerId,
      'Withdrawn',
      'ถอนข้อเสนอสำเร็จ',
    );
  }

  async rejectOffer(postId: string, offerId: string) {
    return this.changeOfferStatus(
      postId,
      offerId,
      'Rejected',
      'ปฏิเสธข้อเสนอสำเร็จ',
    );
  }

  private async changeOfferStatus(
    postId: string,
    offerId: string,
    status: string,
    message: string,
  ) {
    const postPk = this.id(postId, 'post');
    const offerPk = this.id(offerId, 'offer');
    const result = await this.prisma.offer.updateMany({
      where: { offerId: offerPk, postId: postPk, status: 'Pending' },
      data: { status },
    });
    if (result.count === 0)
      throw new NotFoundException('ไม่พบ offer ที่อยู่ในสถานะ Pending');
    return this.ok(message, {
      post_id: this.label('post', postPk),
      offer_id: this.label('offer', offerPk),
      status: status.toLowerCase(),
    });
  }
}
