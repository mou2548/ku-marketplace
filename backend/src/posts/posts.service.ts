import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { publicListing } from './public-listing';
import {
  MEMBERSHIP_CONFIG,
  type MembershipTier,
} from '../common/constants/membership.constant';
import { getItemAvailability } from '../items/item-availability';
import { PrismaService } from '../prisma/prisma.service';
import { displayName } from '../common/utils/display-name';
import { validateText } from '../common/utils/schema-validation';

export interface CreatePostPayload {
  item_id?: number;
  post_type?: string;
  price?: number | null;
  quantity_total?: number;
  description?: string;
  wanted_item_offer?: string;
}

export interface UpdatePostPayload {
  price?: number | null;
  post_type?: string;
  /** Changing this restocks or reduces the channel — see updatePost's own
   * validation: can't drop below what this channel already sold/traded, and
   * an increase can't exceed the item's current available quantity. */
  quantity_total?: number;
  description?: string;
  wanted_item_offer?: string;
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

  serializePost(post: {
    postId: number;
    itemId: number;
    postType: string;
    price: { toNumber(): number } | null;
    quantityTotal: number;
    quantityRemaining: number;
    description?: string | null;
    wantedItemOffer?: string | null;
    createdAt: Date | null;
    item: {
      itemId?: number;
      name: string;
      description: string | null;
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
        firstNameTh?: string | null;
        lastNameTh?: string | null;
        emailVerifiedAt?: Date | null;
        avatarUrl?: string | null;
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
      // The channel's own listing description — distinct from item.description
      // (the item's own facts, nested below, shared by every channel it backs).
      description: post.description ?? null,
      wanted_item_offer: post.wantedItemOffer ?? null,
      price: post.price?.toNumber() ?? null,
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
            name: displayName(owner),
            isVerified: Boolean(owner.emailVerifiedAt),
            avatar_url: owner.avatarUrl ?? null,
          }
        : null,
    };
  }

  private async requirePostOwner(postId: string, userId: number) {
    const post = await this.prisma.post.findUnique({
      where: { postId: this.id(postId, 'post'), deletedAt: null },
      include: { item: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.item.ownerId !== userId)
      throw new ForbiddenException(
        'Only the post owner can perform this action',
      );
  }

  private async requirePromptPay(
    tx: Pick<Prisma.TransactionClient, 'user'>,
    sellerId: number,
  ) {
    const seller = await tx.user.findUnique({
      where: { userId: sellerId },
      select: { promptpayId: true },
    });
    if (!seller?.promptpayId?.trim()) {
      throw new ConflictException(
        'กรุณาตั้งค่า PromptPay ของผู้ขายก่อนทำรายการที่มีการชำระเงิน',
      );
    }
  }

  async createPost(payload: CreatePostPayload, userId: number) {
    validateText(payload.description, 'description', 2000);
    validateText(payload.wanted_item_offer, 'wanted_item_offer', 500);
    if (!payload.item_id || !payload.post_type) {
      throw new BadRequestException('item_id และ post_type จำเป็นต้องระบุ');
    }
    if (!['SellOnly', 'TradeOnly', 'Both'].includes(payload.post_type)) {
      throw new BadRequestException(
        'post_type ต้องเป็น SellOnly, TradeOnly หรือ Both',
      );
    }
    const quantity = payload.quantity_total ?? 1;
    const itemId = payload.item_id;
    const postType = payload.post_type;
    const price = payload.price ?? null;
    if (postType !== 'TradeOnly' && price === null) {
      throw new BadRequestException('price is required for SellOnly and Both');
    }
    if (
      (price !== null &&
        (!Number.isFinite(price) || price < 0 || price > 99999999.99)) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !Number.isSafeInteger(itemId) ||
      itemId < 1
    ) {
      throw new BadRequestException(
        'price ต้องไม่ติดลบและ quantity_total ต้องมากกว่า 0',
      );
    }

    const post = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "item_id" FROM "Item" WHERE "item_id" = ${itemId} FOR UPDATE`;
      const item = await tx.item.findUnique({ where: { itemId } });
      if (!item) throw new NotFoundException('ไม่พบสินค้า');
      if (item.ownerId !== userId)
        throw new ForbiddenException('Only the owner can list this item');
      if (item.deletedAt)
        throw new ConflictException('Item is not available for listing');
      if (postType !== 'TradeOnly') {
        await this.requirePromptPay(tx, userId);
      }
      const { available } = await getItemAvailability(tx, itemId);
      if (quantity > available)
        throw new BadRequestException(
          'Listing quantity exceeds available inventory quantity',
        );
      const reservedOffer = await tx.offerItem.findFirst({
        where: {
          itemId,
          offer: {
            transactions: {
              some: {
                status: {
                  in: ['Pending', 'Processing', 'Pending Refund', 'Completed'],
                },
              },
            },
          },
        },
      });
      if (reservedOffer)
        throw new ConflictException('Item is reserved for an accepted trade');

      // §membership quota — charged once per item per month, not once per
      // channel: an item that already has a post/relist this month doesn't
      // pay again to open a 2nd or 3rd channel in the same month.
      await tx.$queryRaw`SELECT "user_id" FROM "User" WHERE "user_id" = ${userId} FOR UPDATE`;
      const now = new Date();
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      const chargedThisMonth = await tx.post.findFirst({
        where: { itemId, createdAt: { gte: monthStart } },
        select: { postId: true },
      });
      if (!chargedThisMonth) {
        const subscription = await tx.subscription.findFirst({
          where: { userId },
        });
        const tier: MembershipTier =
          subscription?.status === 'Active' &&
          subscription.endDate &&
          subscription.endDate > now
            ? (subscription.tier as MembershipTier)
            : 'Free';
        const quota =
          MEMBERSHIP_CONFIG[tier]?.postQuota ?? (tier === 'Diamond' ? null : 3);
        if (quota !== null) {
          const itemsChargedThisMonth = await tx.post.groupBy({
            by: ['itemId'],
            where: {
              item: { ownerId: userId },
              createdAt: { gte: monthStart },
            },
          });
          if (itemsChargedThisMonth.length >= quota)
            throw new ForbiddenException('Monthly listing quota reached');
        }
      }

      const created = await tx.post.create({
        data: {
          itemId,
          postType,
          price,
          quantityTotal: quantity,
          quantityRemaining: quantity,
          status: 'Active',
          deletedAt: null,
          description: payload.description || null,
          wantedItemOffer: payload.wanted_item_offer || null,
        },
      });
      return { ...created, item };
    });

    return this.serializePost(post);
  }

  async findAllPosts() {
    const posts = await this.prisma.post.findMany({
      // A sold-out post's DB status column never leaves 'Active' — only
      // quantityRemaining tracks that (buyPost/acceptOffer decrement it
      // atomically) — so the public feed has to filter on it directly, or a
      // fully-sold post lingers here forever, inviting a second buyer to try
      // (and fail) a purchase that already happened.
      where: publicListing(),
      include: {
        item: {
          include: {
            images: {
              where: { status: 'Active' },
              orderBy: { displayOrder: 'asc' },
            },
            owner: {
              select: {
                userId: true,
                firstNameEn: true,
                lastNameEn: true,
                firstNameTh: true,
                lastNameTh: true,
                emailVerifiedAt: true,
                avatarUrl: true,
              },
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
      where: {
        postId: this.id(postId, 'post'),
        AND: publicListing(),
      },
      include: {
        item: {
          include: {
            images: {
              where: { status: 'Active' },
              orderBy: { displayOrder: 'asc' },
            },
            owner: {
              select: {
                userId: true,
                firstNameEn: true,
                lastNameEn: true,
                firstNameTh: true,
                lastNameTh: true,
                emailVerifiedAt: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
    if (!post) throw new NotFoundException('ไม่พบโพสต์');
    return this.serializePost(post);
  }

  async updatePost(postId: string, payload: UpdatePostPayload, userId: number) {
    validateText(payload.description, 'description', 2000);
    validateText(payload.wanted_item_offer, 'wanted_item_offer', 500);
    if (
      payload.price === undefined &&
      payload.post_type === undefined &&
      payload.quantity_total === undefined &&
      payload.description === undefined &&
      payload.wanted_item_offer === undefined
    ) {
      throw new BadRequestException('ไม่มีข้อมูลที่จะแก้ไข');
    }
    if (
      payload.price !== undefined &&
      payload.price !== null &&
      (!Number.isFinite(payload.price) ||
        payload.price < 0 ||
        payload.price > 99999999.99)
    ) {
      throw new BadRequestException('price ต้องเป็นเลขที่ไม่ติดลบ');
    }
    if (
      payload.post_type !== undefined &&
      !['SellOnly', 'TradeOnly', 'Both'].includes(payload.post_type)
    ) {
      throw new BadRequestException(
        'post_type ต้องเป็น SellOnly, TradeOnly หรือ Both',
      );
    }
    if (
      payload.quantity_total !== undefined &&
      (!Number.isInteger(payload.quantity_total) || payload.quantity_total < 1)
    ) {
      throw new BadRequestException(
        'quantity_total ต้องเป็นจำนวนเต็มที่มากกว่า 0',
      );
    }
    await this.requirePostOwner(postId, userId);
    const id = this.id(postId, 'post');
    if (payload.post_type !== undefined && payload.post_type !== 'TradeOnly') {
      await this.assertHasPromptPay(
        this.prisma,
        userId,
        'กรุณาตั้งค่า PromptPay ในโปรไฟล์ก่อนเปิดขายสินค้า',
      );
    }

    const post = await this.prisma.$transaction(async (tx) => {
      const found = await tx.post.findUnique({
        where: { postId: id, deletedAt: null },
      });
      if (!found) throw new NotFoundException('ไม่พบโพสต์');
      const nextPrice =
        payload.price === undefined ? found.price : payload.price;
      if (
        (payload.post_type ?? found.postType) !== 'TradeOnly' &&
        nextPrice === null
      ) {
        throw new BadRequestException(
          'price is required for SellOnly and Both',
        );
      }
      if ((payload.post_type ?? found.postType) !== 'TradeOnly') {
        await this.requirePromptPay(tx, userId);
      }

      let quantityTotal = found.quantityTotal;
      let quantityRemaining = found.quantityRemaining;
      // §restock/reduce — changing quantity_total on an existing channel.
      // Locked the same way createPost locks the item before recomputing
      // availability, since two concurrent restocks on the same item could
      // otherwise both read the same "room left" figure and overcommit it.
      if (
        payload.quantity_total !== undefined &&
        payload.quantity_total !== found.quantityTotal
      ) {
        await tx.$queryRaw`SELECT "item_id" FROM "Item" WHERE "item_id" = ${found.itemId} FOR UPDATE`;
        const sold = found.quantityTotal - found.quantityRemaining;
        if (payload.quantity_total < sold) {
          throw new BadRequestException(
            `ลดจำนวนได้ต่ำสุด ${sold} ชิ้น เพราะขายหรือแลกไปแล้วเท่านั้นในโพสต์นี้`,
          );
        }
        const delta = payload.quantity_total - found.quantityTotal;
        if (delta > 0) {
          const { available } = await getItemAvailability(tx, found.itemId);
          if (delta > available) {
            throw new BadRequestException(
              'เพิ่มจำนวนเกินกว่าสต็อกที่เหลืออยู่ของสินค้านี้',
            );
          }
        }
        quantityTotal = payload.quantity_total;
        quantityRemaining = found.quantityRemaining + delta;
      }

      return tx.post.update({
        where: { postId: id },
        data: {
          ...(payload.price !== undefined && { price: payload.price }),
          ...(payload.post_type !== undefined && {
            postType: payload.post_type,
          }),
          ...(payload.description !== undefined && {
            description: payload.description || null,
          }),
          ...(payload.wanted_item_offer !== undefined && {
            wantedItemOffer: payload.wanted_item_offer || null,
          }),
          quantityTotal,
          quantityRemaining,
        },
      });
    });

    return {
      post_id: this.label('post', post.postId),
      price: post.price?.toNumber() ?? null,
      post_type: post.postType,
      quantity_total: post.quantityTotal,
      quantity_remaining: post.quantityRemaining,
    };
  }

  async deletePost(postId: string, userId: number) {
    await this.requirePostOwner(postId, userId);
    const id = this.id(postId, 'post');
    const post = await this.prisma.post.findUnique({
      where: { postId: id, deletedAt: null },
    });
    if (!post) throw new NotFoundException('ไม่พบโพสต์');
    // §unlock — a Cancelled transaction never moved the item, and a Pending
    // offer is the only kind still awaiting a decision (Accepted implies a
    // transaction, which is checked directly; Rejected/Withdrawn/Cancelled
    // are already done). Counting every offer/transaction ever made here —
    // including cancelled ones — used to lock a post out of being
    // unlisted/relisted forever the moment any deal on it fell through.
    const [blockingOffer, blockingTransaction] = await Promise.all([
      this.prisma.offer.findFirst({ where: { postId: id, status: 'Pending' } }),
      this.prisma.transaction.findFirst({
        where: { postId: id, status: { not: 'Cancelled' } },
      }),
    ]);
    if (blockingOffer || blockingTransaction) {
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
    await this.prisma.post.update({
      where: { postId: id },
      data: { status: 'Inactive', deletedAt: new Date() },
    });
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
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !['Meetup', 'Shipping'].includes(deliveryMethod)
    ) {
      throw new BadRequestException('quantity หรือ delivery_method ไม่ถูกต้อง');
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { postId: id, AND: publicListing() },
        include: {
          item: {
            include: {
              images: {
                where: { status: 'Active' },
                orderBy: { displayOrder: 'asc' },
              },
              owner: {
                select: {
                  userId: true,
                  firstNameEn: true,
                  lastNameEn: true,
                  firstNameTh: true,
                  lastNameTh: true,
                  emailVerifiedAt: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });
      if (!post) throw new NotFoundException('ไม่พบโพสต์');
      if (!['SellOnly', 'Both'].includes(post.postType)) {
        throw new ConflictException('โพสต์นี้รองรับการแลกเปลี่ยนเท่านั้น');
      }
      if (post.price === null) {
        throw new ConflictException('This post has no sale price');
      }
      if (post.item.ownerId === buyerId) {
        throw new ConflictException(
          'เจ้าของโพสต์ไม่สามารถซื้อสินค้าของตัวเองได้',
        );
      }
      if (post.quantityRemaining < quantity) {
        throw new ConflictException('สินค้าเหลือไม่เพียงพอ');
      }
      await this.requirePromptPay(tx, post.item.ownerId);
      const buyer = await tx.user.findUnique({ where: { userId: buyerId } });
      if (!buyer) throw new NotFoundException('ไม่พบผู้ซื้อ');
      const totalAmount = post.price.mul(quantity);
      if (totalAmount.greaterThan('99999999.99')) {
        throw new BadRequestException(
          'total_amount exceeds the database limit',
        );
      }
      const created = await tx.transaction.create({
        data: {
          postId: id,
          buyerId,
          sellerId: post.item.ownerId,
          quantity,
          totalAmount,
          deliveryMethod,
          status: 'Pending',
        },
      });
      const reserved = await tx.post.updateMany({
        where: {
          postId: id,
          deletedAt: null,
          status: 'Active',
          quantityRemaining: { gte: quantity },
          AND: publicListing(),
        },
        data: { quantityRemaining: { decrement: quantity } },
      });
      if (reserved.count !== 1)
        throw new ConflictException(
          'Post is unavailable or stock is insufficient',
        );
      await tx.chatRoom.create({
        data: { transactionId: created.transactionId },
      });
      return created;
    });

    return {
      transaction_id: this.label('transaction', transaction.transactionId),
      post_id: this.label('post', transaction.postId),
      buyer_id: transaction.buyerId,
      delivery_method: transaction.deliveryMethod,
      quantity: transaction.quantity,
      total_amount: transaction.totalAmount.toNumber(),
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
    if (
      !Array.isArray(payload.item_ids) ||
      payload.item_ids.some((id) => !Number.isSafeInteger(id) || id < 1) ||
      !Number.isFinite(payload.additional_money ?? 0) ||
      (payload.additional_money ?? 0) < 0 ||
      (payload.additional_money ?? 0) > 99999999.99
    ) {
      throw new BadRequestException(
        'Invalid offered items or additional money',
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
              select: {
                userId: true,
                firstNameEn: true,
                lastNameEn: true,
                firstNameTh: true,
                lastNameTh: true,
                emailVerifiedAt: true,
                avatarUrl: true,
                status: true,
              },
            },
          },
        },
      },
    });
    if (!post) throw new NotFoundException('ไม่พบโพสต์');
    if (!['TradeOnly', 'Both'].includes(post.postType)) {
      throw new ConflictException('โพสต์นี้รองรับการซื้อเท่านั้น');
    }
    if (
      post.item.owner.status !== 'Active' ||
      post.status !== 'Active' ||
      post.quantityRemaining < 1 ||
      post.item.deletedAt
    ) {
      throw new ConflictException(
        'Post is unavailable or stock is insufficient',
      );
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
      select: { itemId: true, ownerId: true, quantity: true, deletedAt: true },
    });
    if (items.length !== itemIds.length)
      throw new NotFoundException('ไม่พบสินค้าที่ใช้เสนอแลกบางรายการ');
    if (items.some((item) => item.ownerId !== proposerId)) {
      throw new ForbiddenException(
        'สินค้าที่ใช้เสนอแลกต้องเป็นของผู้เสนอเท่านั้น',
      );
    }
    if (items.some((item) => item.deletedAt)) {
      throw new ConflictException('An offered item is no longer available');
    }
    const itemAvailabilities = await Promise.all(
      items.map((item) => getItemAvailability(this.prisma, item.itemId)),
    );
    if (
      items.some(
        (item, index) => itemAvailabilities[index].available !== item.quantity,
      )
    ) {
      throw new ConflictException('An offered item is no longer available');
    }
    const reservedItem = await this.prisma.offerItem.findFirst({
      where: {
        itemId: { in: itemIds },
        offer: {
          transactions: {
            some: {
              status: {
                in: ['Pending', 'Processing', 'Pending Refund', 'Completed'],
              },
            },
          },
        },
      },
    });
    if (reservedItem) {
      throw new ConflictException(
        'An offered item is reserved by another trade',
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
    userId: number,
  ) {
    await this.requirePostOwner(postId, userId);
    const postPk = this.id(postId, 'post');
    const offerPk = this.id(offerId, 'offer');
    // §trade — a swap is always handed over in person. The trade flow in the
    // activity diagram has only the meetup branch; `payload.delivery_method`
    // is ignored here on purpose.
    void payload;
    const deliveryMethod = 'Meetup';
    const transaction = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "post_id" FROM "Post" WHERE "post_id" = ${postPk} FOR UPDATE`;
      const offer = await tx.offer.findFirst({
        where: { offerId: offerPk, postId: postPk },
        include: { post: { include: { item: true } }, items: true },
      });
      if (!offer) throw new NotFoundException('ไม่พบ offer');
      if (
        !(await tx.post.count({
          where: { postId: postPk, AND: publicListing() },
        }))
      )
        throw new ConflictException('Post is unavailable');
      if (
        !(await tx.user.count({
          where: { userId: offer.proposerId, status: 'Active' },
        }))
      )
        throw new ConflictException('Proposer unavailable');
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

      if (new Prisma.Decimal(offer.additionalMoney ?? 0).greaterThan(0)) {
        await this.requirePromptPay(tx, offer.post.item.ownerId);
      }

      const offeredIds = offer.items
        .map((entry) => entry.itemId)
        .sort((a, b) => a - b);
      if (offeredIds.length === 0)
        throw new ConflictException('Offer has no items');
      await tx.$queryRaw(
        Prisma.sql`SELECT "item_id" FROM "Item" WHERE "item_id" IN (${Prisma.join(offeredIds)}) ORDER BY "item_id" FOR UPDATE`,
      );
      const offeredItems = await tx.item.findMany({
        where: {
          itemId: { in: offeredIds },
          ownerId: offer.proposerId,
          deletedAt: null,
        },
        select: { itemId: true, quantity: true },
      });
      if (offeredItems.length !== offeredIds.length)
        throw new ConflictException('An offered item is no longer available');
      const offeredAvailabilities = await Promise.all(
        offeredItems.map((item) => getItemAvailability(tx, item.itemId)),
      );
      const allFullyAvailable = offeredItems.every(
        (item, index) =>
          offeredAvailabilities[index].available === item.quantity,
      );
      if (!allFullyAvailable)
        throw new ConflictException('An offered item is no longer available');
      const reservedItem = await tx.offerItem.findFirst({
        where: {
          itemId: { in: offeredIds },
          offerId: { not: offerPk },
          offer: {
            transactions: {
              some: {
                status: {
                  in: ['Pending', 'Processing', 'Pending Refund', 'Completed'],
                },
              },
            },
          },
        },
      });
      if (reservedItem)
        throw new ConflictException(
          'An offered item is reserved by another trade',
        );

      const created = await tx.transaction.create({
        data: {
          postId: postPk,
          offerId: offerPk,
          buyerId: offer.proposerId,
          sellerId: offer.post.item.ownerId,
          quantity: 1,
          totalAmount: offer.additionalMoney ?? new Prisma.Decimal(0),
          deliveryMethod,
          status: 'Pending',
        },
      });
      const accepted = await tx.offer.updateMany({
        where: { offerId: offerPk, status: 'Pending' },
        data: { status: 'Accepted' },
      });
      if (accepted.count !== 1)
        throw new ConflictException('Offer is no longer pending');
      await tx.offer.updateMany({
        where: { postId: postPk, offerId: { not: offerPk }, status: 'Pending' },
        data: { status: 'Rejected' },
      });
      const reserved = await tx.post.updateMany({
        where: {
          postId: postPk,
          deletedAt: null,
          status: 'Active',
          quantityRemaining: { gte: 1 },
        },
        data: { quantityRemaining: { decrement: 1 } },
      });
      if (reserved.count !== 1)
        throw new ConflictException(
          'Post is unavailable or stock is insufficient',
        );
      await tx.chatRoom.create({
        data: { transactionId: created.transactionId },
      });
      return created;
    });

    return {
      transaction_id: this.label('transaction', transaction.transactionId),
      post_id: this.label('post', postPk),
      offer_id: this.label('offer', offerPk),
      delivery_method: transaction.deliveryMethod,
      total_amount: transaction.totalAmount.toNumber(),
      status: 'accepted',
    };
  }

  async withdrawOffer(postId: string, offerId: string, userId: number) {
    return this.changeOfferStatus(postId, offerId, 'Withdrawn', userId);
  }

  async rejectOffer(postId: string, offerId: string, userId: number) {
    return this.changeOfferStatus(postId, offerId, 'Rejected', userId);
  }

  private async changeOfferStatus(
    postId: string,
    offerId: string,
    status: string,
    userId: number,
  ) {
    const postPk = this.id(postId, 'post');
    const offerPk = this.id(offerId, 'offer');
    const result = await this.prisma.offer.updateMany({
      where: {
        offerId: offerPk,
        postId: postPk,
        status: 'Pending',
        ...(status === 'Withdrawn'
          ? { proposerId: userId }
          : { post: { item: { ownerId: userId } } }),
      },
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
        images: {
          where: { status: 'Active' },
          orderBy: { displayOrder: 'asc' },
        },
        owner: {
          select: {
            userId: true,
            firstNameEn: true,
            lastNameEn: true,
            firstNameTh: true,
            lastNameTh: true,
            emailVerifiedAt: true,
            avatarUrl: true,
          },
        },
      },
    } as const;

    const offers = await this.prisma.offer.findMany({
      where: {
        OR: [{ proposerId: userId }, { post: { item: { ownerId: userId } } }],
      },
      include: {
        proposer: {
          select: {
            userId: true,
            firstNameEn: true,
            lastNameEn: true,
            firstNameTh: true,
            lastNameTh: true,
            emailVerifiedAt: true,
            avatarUrl: true,
          },
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
        name: displayName(offer.proposer),
        isVerified: true,
        avatar_url: offer.proposer.avatarUrl ?? null,
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
