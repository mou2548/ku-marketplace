import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async count() {
    const count = await this.prisma.item.count();
    return { count };
  }

  async getCategories() {
    const categories = await this.prisma.item.groupBy({
      by: ['category'],
    });
    return categories.map((c) => c.category);
  }

  async create(createItemDto: CreateItemDto) {
    const { images, warranty_expiry, ...itemData } = createItemDto;

    return this.prisma.item.create({
      data: {
        ...itemData,
        ownerId: 1,
        warrantyExpiry: warranty_expiry ? new Date(warranty_expiry) : null,
        images:
          images && images.length > 0
            ? {
                create: images.map((img) => ({
                  imageUrl: img.image_url,
                  isPrimary: img.is_primary ?? false,
                  displayOrder: img.display_order ?? 0,
                })),
              }
            : undefined,
      },
      include: {
        images: true,
      },
    });
  }

  async findAll() {
    return this.prisma.item.findMany({
      include: {
        images: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.item.findUnique({
      where: { itemId: id },
      include: {
        images: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async update(id: number, updateItemDto: UpdateItemDto) {
    const { images, warranty_expiry, ...itemData } = updateItemDto;

    try {
      return await this.prisma.item.update({
        where: { itemId: id },
        data: {
          ...itemData,
          ...(warranty_expiry !== undefined && {
            warrantyExpiry: warranty_expiry ? new Date(warranty_expiry) : null,
          }),
          ...(images && {
            images: {
              deleteMany: {},
              create: images.map((img) => ({
                imageUrl: img.image_url,
                isPrimary: img.is_primary ?? false,
                displayOrder: img.display_order ?? 0,
              })),
            },
          }),
        },
        include: {
          images: true,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Item with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.item.delete({
        where: { itemId: id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Item with ID ${id} not found`);
      }
      throw error;
    }
  }
}