import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { getItemAvailability } from './item-availability';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async count() {
    const count = await this.prisma.item.count({
      where: { deletedAt: null },
    });
    return { count };
  }

  async getCategories() {
    const categories = await this.prisma.item.groupBy({
      by: ['category'],
      where: { deletedAt: null },
    });
    return categories.map((c) => c.category);
  }

  async create(createItemDto: CreateItemDto, userId: number) {
    const { images, warranty_expiry, course_name, brand_model, ...itemData } =
      createItemDto;

    return this.prisma.item.create({
      data: {
        ...itemData,
        ownerId: userId,
        courseName: course_name,
        brandModel: brand_model,
        warrantyExpiry: warranty_expiry ? new Date(warranty_expiry) : null,
        images:
          images && images.length > 0
            ? {
                create: images.map((img) => ({
                  imageUrl: img.image_url,
                  isPrimary: img.is_primary ?? false,
                  displayOrder: img.display_order ?? 0,
                  status: 'Active',
                })),
              }
            : undefined,
      },
      include: {
        images: { where: { status: 'Active' } },
      },
    });
  }

  async findAll() {
    return this.prisma.item.findMany({
      where: { deletedAt: null },
      include: {
        images: { where: { status: 'Active' } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.item.findUnique({
      where: { itemId: id, deletedAt: null },
      include: {
        images: { where: { status: 'Active' } },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async historySummary(id: number, userId: number) {
    const item = await this.prisma.item.findUnique({
      where: { itemId: id, deletedAt: null },
      include: {
        posts: {
          include: {
            transactions: {
              where: { status: 'Completed' },
              select: { offerId: true, quantity: true },
            },
          },
        },
        giveawayPosts: {
          include: {
            tickets: {
              where: { status: 'Received' },
              select: { ticketId: true },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
    if (item.ownerId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to view this item history',
      );
    }

    const completed = item.posts.flatMap((post) => post.transactions);
    const sumQuantity = (withOffer: boolean) =>
      completed
        .filter((transaction) => Boolean(transaction.offerId) === withOffer)
        .reduce((total, transaction) => total + (transaction.quantity ?? 1), 0);

    const openPosts = item.posts.filter(
      (post) => post.deletedAt === null && post.status === 'Active',
    );
    const openGiveaways = item.giveawayPosts.filter(
      (giveaway) => giveaway.status === 'Active',
    );
    const { available } = await getItemAvailability(this.prisma, id);

    return {
      item_id: item.itemId,
      inventory_quantity: item.quantity,
      posted_quantity: item.posts.reduce(
        (total, post) => total + post.quantityTotal,
        0,
      ),
      currently_listed_quantity: openPosts.reduce(
        (total, post) => total + post.quantityRemaining,
        0,
      ),
      available_quantity: available,
      sold_quantity: sumQuantity(false),
      traded_quantity: sumQuantity(true),
      given_quantity: item.giveawayPosts.reduce(
        (total, giveaway) => total + giveaway.tickets.length,
        0,
      ),
      channels: [
        ...openPosts.map((post) => ({
          type: 'post' as const,
          post_id: post.postId,
          post_type: post.postType,
          quantity_total: post.quantityTotal,
          quantity_remaining: post.quantityRemaining,
        })),
        ...openGiveaways.map((giveaway) => ({
          type: 'giveaway' as const,
          giveaway_id: giveaway.giveawayId,
          quantity_total: giveaway.quantity,
          quantity_claimed: giveaway.tickets.length,
        })),
      ],
    };
  }

  async update(id: number, updateItemDto: UpdateItemDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "item_id" FROM "Item" WHERE "item_id" = ${id} FOR UPDATE`;
      const item = await tx.item.findUnique({
        where: { itemId: id, deletedAt: null },
      });

      if (!item) {
        throw new NotFoundException(`Item with ID ${id} not found`);
      }

      if (item.ownerId !== userId) {
        throw new ForbiddenException(
          'You are not authorized to update this item',
        );
      }

      const reserved = await tx.offerItem.findFirst({
        where: {
          itemId: id,
          offer: {
            transactions: {
              some: {
                status: {
                  in: ['Pending', 'Processing', 'Pending Refund'],
                },
              },
            },
          },
        },
      });
      const { available, isTransferred } = await getItemAvailability(tx, id);
      if (reserved || isTransferred)
        throw new ConflictException('This item is committed to a transaction');
      if (
        updateItemDto.quantity !== undefined &&
        updateItemDto.quantity !== item.quantity &&
        available !== item.quantity
      )
        throw new ConflictException(
          'Unlist the item before changing its quantity',
        );
      const { images, warranty_expiry, course_name, brand_model, ...itemData } =
        updateItemDto;

      return tx.item.update({
        where: { itemId: id },
        data: {
          ...itemData,
          ...(course_name !== undefined && { courseName: course_name }),
          ...(brand_model !== undefined && { brandModel: brand_model }),
          ...(warranty_expiry !== undefined && {
            warrantyExpiry: warranty_expiry ? new Date(warranty_expiry) : null,
          }),
          ...(images && {
            images: {
              // §soft-delete — mark the previous set Inactive instead of
              // physically deleting them, so image history survives (evidence
              // for reports/disputes). Reads always filter to status: 'Active'
              // (see findAll/findOne/create above), so this is invisible to
              // normal API consumers.
              updateMany: { where: {}, data: { status: 'Inactive' } },
              create: images.map((img) => ({
                imageUrl: img.image_url,
                isPrimary: img.is_primary ?? false,
                displayOrder: img.display_order ?? 0,
                status: 'Active',
              })),
            },
          }),
        },
        include: {
          images: { where: { status: 'Active' } },
        },
      });
    });
  }

  async remove(id: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "item_id" FROM "Item" WHERE "item_id" = ${id} FOR UPDATE`;
      const item = await tx.item.findUnique({
        where: { itemId: id, deletedAt: null },
      });

      if (!item) {
        throw new NotFoundException(`Item with ID ${id} not found`);
      }

      if (item.ownerId !== userId) {
        throw new ForbiddenException(
          'You are not authorized to delete this item',
        );
      }

      const reserved = await tx.offerItem.findFirst({
        where: {
          itemId: id,
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
      const { available, isTransferred } = await getItemAvailability(tx, id);
      if (reserved || isTransferred)
        throw new ConflictException('This item is committed to a transaction');
      if (available !== item.quantity)
        throw new ConflictException('Unlist the item before deleting it');
      // §soft-delete — Item is master data that Report/Appeal evidence may
      // still point to, so this never physically removes the row. Hard
      // deleting used to also blow up with a raw FK violation the moment the
      // item had any Item_Image row, since nothing cleaned those up first.
      return tx.item.update({
        where: { itemId: id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
