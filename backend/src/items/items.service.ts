import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemCondition } from '@prisma/client';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async count() {
    const count = await this.prisma.item.count();
    return { count };
  }

  async create(createItemDto: CreateItemDto) {
    const { images, warranty_expiry, category, ...itemData } = createItemDto;

    return this.prisma.item.create({
      data: {
        ...itemData,
        // Satisfies Prisma's required owner relation in schema
        owner: {
          connect: { user_id: 1 },
        },
        warranty_expiry: warranty_expiry ? new Date(warranty_expiry) : null,

        // Connect category by slug
        ...(category && {
          category: {
            connect: { slug: category },
          },
        }),

        // Create images if provided
        images: images && images.length > 0
          ? {
              create: images.map((img) => ({
                image_url: img.image_url,
                is_primary: img.is_primary ?? false,
                display_order: img.display_order ?? 0,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        category: true,
      },
    });
  }

  async findAll() {
    return this.prisma.item.findMany({
      include: {
        images: true,
        category: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.item.findUnique({
      where: { item_id: id },
      include: {
        images: true,
        category: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async update(id: number, updateItemDto: UpdateItemDto) {
    const { images, category, warranty_expiry, condition, ...itemData } = updateItemDto;

    try {
      return await this.prisma.item.update({
        where: { item_id: id },
        data: {
          ...itemData,
          ...(condition && { condition: condition as ItemCondition }),
          ...(warranty_expiry !== undefined && {
            warranty_expiry: warranty_expiry ? new Date(warranty_expiry) : null,
          }),
          ...(category && {
            category: {
              connect: { slug: category },
            },
          }),
          ...(images && {
            images: {
              deleteMany: {},
              create: images.map((img) => ({
                image_url: img.image_url,
                is_primary: img.is_primary ?? false,
                display_order: img.display_order ?? 0,
              })),
            },
          }),
        },
        include: {
          images: true,
          category: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Item or connected relation with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.item.delete({
        where: { item_id: id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Item with ID ${id} not found`);
      }
      throw error;
    }
  }
}