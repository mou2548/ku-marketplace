// src/items/items.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemCondition } from '@prisma/client';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createItemDto: CreateItemDto, ownerId: number = 1) {
    const { images, warranty_expiry, category, ...itemData } = createItemDto;

    return this.prisma.item.create({
      data: {
        ...itemData,
        //  Use relational connect for owner instead of owner_id scalar
        owner: {
          connect: { user_id: ownerId },
        },
        warranty_expiry: warranty_expiry ? new Date(warranty_expiry) : null,

        //  Connect category by slug
        ...(category && {
          category: {
            connect: { slug: category },
          },
        }),

        images: images
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
        owner: {
          select: {
            user_id: true,
            first_name_en: true,
            last_name_en: true,
            email: true,
          },
        },
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
        owner: {
          select: {
            user_id: true,
            first_name_en: true,
            last_name_en: true,
            email: true,
          },
        },
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
        },
        include: {
          images: true,
          category: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Item with ID ${id} not found`);
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

  async getCategories() {
    return this.prisma.category.findMany({
      include: {
        _count: {
          select: { items: true },
        },
      },
    });
  }
}