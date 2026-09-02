import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  buyer_id: number;
  delivery_method?: string;
  quantity?: number;
}

export interface CreateOfferPayload {
  proposer_id: number;
  item_ids?: number[];
  additional_money?: number;
}

export interface AcceptOfferPayload {
  delivery_method?: string;
}

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

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
    item: {
      itemId?: number;
      name: string;
      description: string | null;
      status: string | null;
      category?: string;
      condition?: string;
      courseName?: string | null;
      brandModel?: string | null;
      warrantyExpiry?: Date | null;
      size?: string | null;
      quantity?: number;
      ownerId?: number;
      images?: Array<{
        imageId: number;
        itemId: number;
        imageUrl: string;
        isPrimary: boolean | null;
        displayOrder: number | null;
      }>;
      owner?: {
        userId: number;
        firstNameEn: string;
        lastNameEn: string;
      } | null;
    };
  }) {
    const item = post.item;
    const owner = item.owner;
    return {
      post_id: this.label('post', post.postId),
      item_id: post.itemId,
      post_type: post.postType,
      // Flat fields kept for backward compatibility with existing callers.
      item_name: item.name,
      description: item.description,
      price: post.price.toNumber(),
      quantity_total: post.quantityTotal,
      quantity_available: post.quantityRemaining,
      quantity_remaining: post.quantityRemaining,
      status: post.quantityRemaining > 0 ? 'active' : 'sold_out',
      created_at: post.createdAt,
      // §feed — nested item + seller so the marketplace grid and the post
      // detail screen can render category, condition, course code, images and
      // the seller trust badge without a second round trip.
      item: {
        item_id: item.itemId ?? post.itemId,
        owner_id: item.ownerId ?? owner?.userId ?? null,
        name: item.name,
        quantity: item.quantity ?? 1,
        category: item.category ?? null,
        condition: item.condition ?? null,
        description: item.description,
        status: item.status,
        course_name: item.courseName ?? null,
        brand_model: item.brandModel ?? null,
        warranty_expiry: item.warrantyExpiry ?? null,
        size: item.size ?? null,
        images: (item.images ?? []).map((img) => ({
          image_id: img.imageId,
          item_id: img.itemId,
          image_url: img.imageUrl,
          is_primary: img.isPrimary ?? false,
          display_order: img.displayOrder ?? 0,
        })),
      },
      seller: owner
        ? {
            user_id: owner.userId,
            name: [owner.firstNameEn, owner.lastNameEn]
              .filter(Boolean)
              .join(' ')
              .trim(),
            // Every account is a verified @ku.th address (research T1); the
            // schema has no separate verification flag.
            isVerified: true,
          }
        : null,
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

    return this.serializePost(post);
  }

  async findAllPosts() {
    const posts = await this.prisma.post.findMany({
      where: { deletedAt: null },
      include: {
        item: {
          include: {
            images: {
              where: { status: 'Active' },
              orderBy: { displayOrder: 'asc' },
            },
            owner: {
              select: { userId: true, firstNameEn: true, lastNameEn: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((p) => this.serializePost(p));
  }

  async getPostById(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { postId: this.id(postId, 'post'), deletedAt: null },
      include: {
        item: {
          include: {
            images: {
              where: { status: 'Active' },
              orderBy: { displayOrder: 'asc' },
            },
            owner: {
              select: { userId: true, firstNameEn: true, lastNameEn: true },
            },
          },
        },
      },
    });
    if (!post) throw new NotFoundException('ไม่พบโพสต์');
    return this.serializePost(post);
  }

  async updatePostPrice(postId: string, payload: UpdatePostPayload) {
    if (payload.price === undefined || payload.price < 0) {
      throw new BadRequestException('price ต้องเป็นเลขที่ไม่ติดลบ');
    }
    const id = this.id(postId, 'post');
    const found = await this.prisma.post.findUnique({
      where: { postId: id, deletedAt: null },
    });
    if (!found) throw new NotFoundException('ไม่พบโพสต์');
    const post = await this.prisma.post.update({
      where: { postId: id },
      data: { price: payload.price },
    });
    return {
      post_id: this.label('post', post.postId),
      price: post.price.toNumber(),
    };
  }

  async deletePost(postId: string) {
    const id = this.id(postId, 'post');
    const post = await this.prisma.post.findUnique({
      where: { postId: id, deletedAt: null },
      include: { _count: { select: { offers: true, transactions: true } } },
    });
    if (!post) throw new NotFoundException('ไม่พบโพสต์');
    if (post._count.offers > 0 || post._count.transactions > 0) {
      throw new ConflictException(
        'ลบโพสต์ที่มี offer หรือ transaction แล้วไม่ได้',
      );
    }
    // §soft-delete — a post with zero offers/transactions can still have an
    // open Report against it (e.g. "Inappropriate Content" needs neither).
    // Hard-deleting used to destroy that evidence out from under an
    // in-progress investigation, so this marks it gone without removing the
    // row. findAllPosts/getPostById both filter deletedAt: null already, so
    // it disappears from the public API immediately.
    await this.prisma.$transaction([
      this.prisma.post.update({
        where: { postId: id },
        data: { status: 'Inactive', deletedAt: new Date() },
      }),
      this.prisma.item.update({
        where: { itemId: post.itemId },
        data: { status: 'Unlisted' },
      }),
    ]);
    return {
      post_id: this.label('post', id),
      deleted: true,
    };
  }

  async buyPost(postId: string, payload: BuyPostPayload) {
    const id = this.id(postId, 'post');
    const quantity = payload.quantity ?? 1;
    const buyerId = payload.buyer_id;
    const deliveryMethod = payload.delivery_method ?? 'Meetup';
    if (!Number.isInteger(buyerId) || buyerId < 1) {
      throw new BadRequestException(
        'buyer_id จำเป็นต้องระบุและต้องเป็นจำนวนเต็มบวก',
      );
    }
    if (quantity < 1 || !['Meetup', 'Shipping'].includes(deliveryMethod)) {
      throw new BadRequestException('quantity หรือ delivery_method ไม่ถูกต้อง');
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { postId: id, deletedAt: null },
        include: {
        item: {
          include: {
            images: {
              where: { status: 'Active' },
              orderBy: { displayOrder: 'asc' },
            },
            owner: {
              select: { userId: true, firstNameEn: true, lastNameEn: true },
            },
          },
        },
      },
      });
      if (!post) throw new NotFoundException('ไม่พบโพสต์');
      if (!['SellOnly', 'Both'].includes(post.postType)) {
        throw new ConflictException('โพสต์นี้รองรับการแลกเปลี่ยนเท่านั้น');
      }
      if (post.item.ownerId === buyerId) {
        throw new ConflictException(
          'เจ้าของโพสต์ไม่สามารถซื้อสินค้าของตัวเองได้',
        );
      }
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

    return {
      transaction_id: this.label('transaction', transaction.transactionId),
      post_id: this.label('post', transaction.postId),
      buyer_id: transaction.buyerId,
      delivery_method: transaction.deliveryMethod,
      quantity: transaction.quantity,
      status: transaction.status,
    };
  }

  async createOffer(postId: string, payload: CreateOfferPayload) {
    const id = this.id(postId, 'post');
    const proposerId = payload.proposer_id;
    if (!Number.isInteger(proposerId) || proposerId < 1) {
      throw new BadRequestException(
        'proposer_id จำเป็นต้องระบุและต้องเป็นจำนวนเต็มบวก',
      );
    }
    const itemIds = [...new Set(payload.item_ids ?? [])];
    if (itemIds.length === 0) {
      throw new BadRequestException('ต้องระบุ item_ids อย่างน้อยหนึ่งรายการ');
    }
    const post = await this.prisma.post.findUnique({
      where: { postId: id, deletedAt: null },
      include: {
        item: {
          include: {
            images: {
              where: { status: 'Active' },
              orderBy: { displayOrder: 'asc' },
            },
            owner: {
              select: { userId: true, firstNameEn: true, lastNameEn: true },
            },
          },
        },
      },
    });
    if (!post) throw new NotFoundException('ไม่พบโพสต์');
    if (!['TradeOnly', 'Both'].includes(post.postType)) {
      throw new ConflictException('โพสต์นี้รองรับการซื้อเท่านั้น');
    }
    if (post.item.ownerId === proposerId) {
      throw new ConflictException(
        'เจ้าของโพสต์ไม่สามารถเสนอแลกสินค้าของตัวเองได้',
      );
    }
    if (
      !(await this.prisma.user.findUnique({ where: { userId: proposerId } }))
    ) {
      throw new NotFoundException('ไม่พบผู้เสนอ');
    }
    const items = await this.prisma.item.findMany({
      where: { itemId: { in: itemIds } },
      select: { itemId: true, ownerId: true },
    });
    if (items.length !== itemIds.length)
      throw new NotFoundException('ไม่พบสินค้าที่ใช้เสนอแลกบางรายการ');
    if (items.some((item) => item.ownerId !== proposerId)) {
      throw new ForbiddenException(
        'สินค้าที่ใช้เสนอแลกต้องเป็นของผู้เสนอเท่านั้น',
      );
    }

    const offer = await this.prisma.offer.create({
      data: {
        postId: id,
        proposerId,
        additionalMoney: payload.additional_money ?? 0,
        items: { create: itemIds.map((itemId) => ({ itemId })) },
      },
      include: { items: true },
    });
    return this.serializeOffer(offer);
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
    if (
      !(await this.prisma.post.findUnique({
        where: { postId: id, deletedAt: null },
      }))
    ) {
      throw new NotFoundException('ไม่พบโพสต์');
    }
    const offers = await this.prisma.offer.findMany({
      where: { postId: id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return {
      post_id: this.label('post', id),
      offers: offers.map((offer) => this.serializeOffer(offer)),
    };
  }

  async acceptOffer(
    postId: string,
    offerId: string,
    payload: AcceptOfferPayload,
  ) {
    const postPk = this.id(postId, 'post');
    const offerPk = this.id(offerId, 'offer');
    // §trade — a swap is always handed over in person. The trade flow in the
    // activity diagram has only the meetup branch; `payload.delivery_method`
    // is ignored here on purpose.
    void payload;
    const deliveryMethod = 'Meetup';
    const transaction = await this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findFirst({
        where: { offerId: offerPk, postId: postPk },
        include: { post: { include: { item: true } } },
      });
      if (!offer) throw new NotFoundException('ไม่พบ offer');
      if (offer.status !== 'Pending')
        throw new ConflictException('offer นี้ไม่ได้อยู่ในสถานะ Pending');
      if (!['TradeOnly', 'Both'].includes(offer.post.postType)) {
        throw new ConflictException('โพสต์นี้รองรับการซื้อเท่านั้น');
      }
      if (offer.proposerId === offer.post.item.ownerId) {
        throw new ConflictException(
          'เจ้าของโพสต์ไม่สามารถรับ offer ของตัวเองได้',
        );
      }
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

    return {
      transaction_id: this.label('transaction', transaction.transactionId),
      post_id: this.label('post', postPk),
      offer_id: this.label('offer', offerPk),
      delivery_method: transaction.deliveryMethod,
      status: 'accepted',
    };
  }

  async withdrawOffer(postId: string, offerId: string) {
    return this.changeOfferStatus(postId, offerId, 'Withdrawn');
  }

  async rejectOffer(postId: string, offerId: string) {
    return this.changeOfferStatus(postId, offerId, 'Rejected');
  }

  private async changeOfferStatus(
    postId: string,
    offerId: string,
    status: string,
  ) {
    const postPk = this.id(postId, 'post');
    const offerPk = this.id(offerId, 'offer');
    const result = await this.prisma.offer.updateMany({
      where: { offerId: offerPk, postId: postPk, status: 'Pending' },
      data: { status },
    });
    if (result.count === 0)
      throw new NotFoundException('ไม่พบ offer ที่อยู่ในสถานะ Pending');
    return {
      post_id: this.label('post', postPk),
      offer_id: this.label('offer', offerPk),
      status: status.toLowerCase(),
    };
  }

  /**
   * §feed/§E4 — every offer the signed-in user is a party to: ones they
   * proposed, and ones sitting on a post whose item they own. The spec only
   * has `GET /posts/:id/offers` (one post at a time), which cannot build the
   * "what did I offer" half of the inbox at all.
   */
  async getMyOffers(userId: number) {
    const includeItem = {
      include: {
        images: { where: { status: 'Active' }, orderBy: { displayOrder: 'asc' } },
        owner: {
          select: { userId: true, firstNameEn: true, lastNameEn: true },
        },
      },
    } as const;

    const offers = await this.prisma.offer.findMany({
      where: {
        OR: [{ proposerId: userId }, { post: { item: { ownerId: userId } } }],
      },
      include: {
        proposer: {
          select: { userId: true, firstNameEn: true, lastNameEn: true },
        },
        items: { include: { item: includeItem } },
        post: { include: { item: includeItem } },
        transactions: {
          select: { transactionId: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return offers.map((offer) => ({
      offer_id: offer.offerId,
      post_id: offer.postId,
      proposer_id: offer.proposerId,
      additional_money: offer.additionalMoney?.toNumber() ?? 0,
      status: offer.status,
      created_at: offer.createdAt,
      transaction_id: offer.transactions[0]?.transactionId ?? null,
      proposer: {
        user_id: offer.proposer.userId,
        name: [offer.proposer.firstNameEn, offer.proposer.lastNameEn]
          .filter(Boolean)
          .join(' ')
          .trim(),
        isVerified: true,
      },
      items: offer.items.map((oi) => this.serializeInlineItem(oi.item)),
      post: this.serializePost(offer.post),
    }));
  }

  /** The nested `item` shape `serializePost` emits, for a bare item row. */
  private serializeInlineItem(item: {
    itemId: number;
    ownerId: number;
    name: string;
    description: string | null;
    status: string | null;
    category: string;
    condition: string;
    courseName: string | null;
    brandModel: string | null;
    warrantyExpiry: Date | null;
    size: string | null;
    quantity: number;
    images?: Array<{
      imageId: number;
      itemId: number;
      imageUrl: string;
      isPrimary: boolean | null;
      displayOrder: number | null;
    }>;
  }) {
    return {
      item_id: item.itemId,
      owner_id: item.ownerId,
      name: item.name,
      quantity: item.quantity,
      category: item.category,
      condition: item.condition,
      description: item.description,
      status: item.status,
      course_name: item.courseName,
      brand_model: item.brandModel,
      warranty_expiry: item.warrantyExpiry,
      size: item.size,
      images: (item.images ?? []).map((img) => ({
        image_id: img.imageId,
        item_id: img.itemId,
        image_url: img.imageUrl,
        is_primary: img.isPrimary ?? false,
        display_order: img.displayOrder ?? 0,
      })),
    };
  }
}
